'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  BookOpen,
  LogOut,
  Camera,
  Code2,
  FolderGit2,
  Settings,
  ChevronDown,
  Mail,
  Monitor,
  Wrench,
  Plus,
  Check,
  Link2,
  ImagePlus,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Sigma,
  Linkedin,
  Github,
  Instagram,
  Youtube,
  ExternalLink,
  X,
  Pencil,
  Trash2,
  TrendingUp,
  Search,
  Building2,
  Globe,
} from 'lucide-react';
import { PROVIDER_ICONS } from '@/components/icons/SocialProviderIcons';
import { OptimizedRemoteImage } from '@/components/ui/OptimizedRemoteImage';
import { cn } from '@/lib/utils';
import { STACK_AND_TOOLS_MAX } from '@/lib/stackAndToolsLimits';
import {
  settingsBtnPrimary,
  settingsBtnShadowLg,
  settingsBtnShadowSm,
  settingsBtnSecondary,
  settingsBtnSecondaryCompact,
  settingsBtnSecondaryWide,
  settingsBtnIconFab,
} from './buttonStyles';
import { useSidebar } from '@/hooks/useSidebar';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/auth';
import { markOAuthNavigationPending } from '@/lib/oauthNavigation';
import { UploadProfilePicDialog, UploadCoverDialog, UploadMediaDialog, MediaFullViewDialog } from '@/components/profile/dialog';
import { FormDialog } from '@/components/ui/FormDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { HoverCard } from '@/components/ui/HoverCard';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import { getSkillIconUrl, getSkillIconUrlBySlug } from '@/lib/skillIcons';
import { searchTechStack, type TechStackItem } from '@/data/techStack';
import { Toggle, ToggleGroup, ToggleGroupItem, FormInput, FormTextarea, FormCheckbox, Input, Label, SearchableSelect, EntitySearchInput } from '@/components/retroui';
import { getCountryOptions, getStateOptions, getCityOptions, buildLocationString, parseLocationString } from '@/data/location';
import { searchCompaniesWithApi, searchSchools, searchOrganizations } from '@/data/entities';
import { WorkExperienceCard } from './settings-list/WorkExperienceCard';
import { EducationCard } from './settings-list/EducationCard';
import { CertificationCard } from './settings-list/CertificationCard';
import { ProjectCard } from './settings-list/ProjectCard';
import { OpenSourceCard } from './settings-list/OpenSourceCard';
import { type SetupItem as MySetupItem } from './settings-list/MySetupCard';
import { SettingsSectionHeader } from './settings-list/Header';

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

/** Empty state for settings sections (work experience, education, etc.) when no entries exist. */
function SettingsSectionEmptyState({
  icon: Icon,
  title,
  tagline,
  addLabel,
  onAdd,
}: {
  icon: React.ElementType;
  title: string;
  tagline: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border bg-muted/10 py-12 px-6 text-center">
      <span className="flex size-16 items-center justify-center border-2 border-border bg-muted/50 text-muted-foreground mb-4">
        <Icon className="size-8" strokeWidth={1.5} />
      </span>
      <h3 className="text-sm font-black uppercase tracking-wide text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-xs text-muted-foreground">{tagline}</p>
      <button
        type="button"
        onClick={onAdd}
        className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'mt-6 px-4 py-2.5 text-[10px] font-bold tracking-wide')}
      >
        <Plus className="size-3.5" /> {addLabel}
      </button>
    </div>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Account',
    items: [
      { id: 'edit-profile', label: 'Edit Profile', icon: User },
      { id: 'stack-tools', label: 'Stack & Tools', icon: Monitor },
      { id: 'my-setup', label: 'My Setup', icon: Wrench },
      { id: 'work-experiences', label: 'Work Experiences', icon: Briefcase },
      { id: 'education', label: 'Education', icon: GraduationCap },
      { id: 'certifications', label: 'License & Certifications', icon: Award },
      { id: 'projects', label: 'Projects & Publications', icon: FolderGit2 },
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

const FormSection = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div className="space-y-4 pt-6 border-t-2 border-border/50 first:border-t-0 first:pt-0 min-w-0">
    {title ? <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{title}</h3> : null}
    <div className="grid gap-4 min-w-0">{children}</div>
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
  const bioEditorRef = useRef<HTMLDivElement>(null);
  const bioUpdateFromEditorRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [profilePicDialogOpen, setProfilePicDialogOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [profileImg, setProfileImg] = useState(user?.profileImg ?? '');
  const [profileImgBlurDataUrl, setProfileImgBlurDataUrl] = useState<string | null>(null);
  const [coverBanner, setCoverBanner] = useState(user?.coverBanner ?? '');
  const [coverBannerBlurDataUrl, setCoverBannerBlurDataUrl] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState((user as any)?.portfolioUrl ?? '');
  const [linkedin, setLinkedin] = useState(user?.linkedin ?? '');
  const [github, setGithub] = useState(user?.github ?? '');
  const [instagram, setInstagram] = useState(user?.instagram ?? '');
  const [youtube, setYoutube] = useState(user?.youtube ?? '');
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const symbolsRef = useRef<HTMLDivElement>(null);
  const [formatActive, setFormatActive] = useState({ bold: false, italic: false, underline: false });

  const updateFormatState = useCallback(() => {
    const el = bioEditorRef.current;
    if (!el || typeof document === 'undefined') return;
    if (document.activeElement !== el) {
      setFormatActive({ bold: false, italic: false, underline: false });
      return;
    }
    setFormatActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }, []);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setUsername(user?.username ?? '');
    setBio(user?.bio ?? '');
    setProfileImg(user?.profileImg ?? '');
    setProfileImgBlurDataUrl(null);
    setCoverBanner(user?.coverBanner ?? '');
    setCoverBannerBlurDataUrl(null);
    setPortfolioUrl((user as any)?.portfolioUrl ?? '');
    setLinkedin(user?.linkedin ?? '');
    setGithub(user?.github ?? '');
    setInstagram(user?.instagram ?? '');
    setYoutube(user?.youtube ?? '');
  }, [user]);

  useEffect(() => {
    if (!symbolsOpen) return;
    const close = (e: MouseEvent) => {
      if (symbolsRef.current && !symbolsRef.current.contains(e.target as Node)) setSymbolsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [symbolsOpen]);

  useEffect(() => {
    const doc = typeof document !== 'undefined' ? document : null;
    if (!doc) return;
    const onSelectionChange = () => updateFormatState();
    doc.addEventListener('selectionchange', onSelectionChange);
    return () => doc.removeEventListener('selectionchange', onSelectionChange);
  }, [updateFormatState]);

  const handleCoverUploadSuccess = async (result: { url: string; blurDataUrl?: string }) => {
    setCoverBanner(result.url);
    setCoverBannerBlurDataUrl(result.blurDataUrl ?? null);
    try {
      await updateProfile({ coverBanner: result.url });
    } catch {
      // already set in state; user can Save again if needed
    }
  };

  const handleProfilePicUploadSuccess = async (result: { url: string; blurDataUrl?: string }) => {
    setProfileImg(result.url);
    setProfileImgBlurDataUrl(result.blurDataUrl ?? null);
    try {
      await updateProfile({ profileImg: result.url });
    } catch {
      // already set in state; user can Save again if needed
    }
  };

  const markdownToHtml = (raw: string) => {
    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let s = escape(raw || '');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/g, '<u>$1</u>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return s.replace(/\n/g, '<br>');
  };

  const htmlToMarkdown = (el: HTMLElement): string => {
    let out = '';
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent ?? '';
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const e = node as HTMLElement;
      const tag = e.tagName?.toLowerCase();
      if (tag === 'br') {
        out += '\n';
        return;
      }
      if (tag === 'strong' || tag === 'b') {
        out += '**';
        e.childNodes.forEach(walk);
        out += '**';
        return;
      }
      if (tag === 'em' || tag === 'i') {
        out += '*';
        e.childNodes.forEach(walk);
        out += '*';
        return;
      }
      if (tag === 'u') {
        out += '__';
        e.childNodes.forEach(walk);
        out += '__';
        return;
      }
      if (tag === 'li') {
        e.childNodes.forEach(walk);
        out += '\n';
        return;
      }
      if (tag === 'ul' || tag === 'ol') {
        e.childNodes.forEach(walk);
        return;
      }
      e.childNodes.forEach(walk);
    };
    el.childNodes.forEach(walk);
    return out.replace(/\n{2,}/g, '\n').trim();
  };

  const BIO_MAX_LENGTH = 500;

  const applyBioFormat = (command: 'bold' | 'italic' | 'underline') => {
    const el = bioEditorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false);
    const newMarkdown = htmlToMarkdown(el);
    setBio(newMarkdown);
    bioUpdateFromEditorRef.current = true;
    setTimeout(updateFormatState, 0);
  };

  const applyBioList = (type: 'bullet' | 'numbered') => {
    const el = bioEditorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(type === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList', false);
    const newMarkdown = htmlToMarkdown(el);
    setBio(newMarkdown);
    bioUpdateFromEditorRef.current = true;
  };

  const BIO_SYMBOLS = ['•', '◦', '▪', '–', '—', '·', '…', '©', '®', '™', '✓', '✔', '→', '←', '§', '¶', '°', '±', '×', '÷'];

  const insertBioSymbol = (symbol: string) => {
    const el = bioEditorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('insertText', false, symbol);
    setBio(htmlToMarkdown(el));
    bioUpdateFromEditorRef.current = true;
    setSymbolsOpen(false);
  };

  useEffect(() => {
    const el = bioEditorRef.current;
    if (!el || bioUpdateFromEditorRef.current) {
      bioUpdateFromEditorRef.current = false;
      return;
    }
    el.innerHTML = bio.trim() ? markdownToHtml(bio) : '';
  }, [bio]);

  const handleBioInput = () => {
    const el = bioEditorRef.current;
    if (!el) return;
    let text = htmlToMarkdown(el);
    if (text.length > BIO_MAX_LENGTH) {
      text = text.slice(0, BIO_MAX_LENGTH);
      el.innerHTML = markdownToHtml(text);
      bioUpdateFromEditorRef.current = true;
    }
    setBio(text);
    bioUpdateFromEditorRef.current = true;
  };

  const handleBioPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text/plain') ?? '').slice(0, Math.max(0, BIO_MAX_LENGTH - bio.length));
    document.execCommand('insertText', false, text);
    const el = bioEditorRef.current;
    if (el) {
      let result = htmlToMarkdown(el);
      if (result.length > BIO_MAX_LENGTH) {
        result = result.slice(0, BIO_MAX_LENGTH);
        el.innerHTML = markdownToHtml(result);
        bioUpdateFromEditorRef.current = true;
      }
      setBio(result);
      bioUpdateFromEditorRef.current = true;
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
        portfolioUrl: portfolioUrl.trim() || undefined,
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
      <section className="border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] overflow-hidden">
        <div className="relative h-40 w-full overflow-hidden border-b-4 border-border">
          {coverBanner ? (
            <OptimizedRemoteImage
              src={coverBanner}
              alt="Cover"
              fill
              sizes="100vw"
              blurDataUrl={coverBannerBlurDataUrl}
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full gradient-auto" />
          )}
          <button
            type="button"
            onClick={() => setCoverDialogOpen(true)}
            className="absolute right-3 bottom-3 inline-flex items-center justify-center bg-black/70 border-2 border-white/40 text-white size-8 hover:bg-black/90 transition-colors"
            aria-label="Edit cover image"
          >
            <Camera className="size-4" />
          </button>
        </div>
        <div className="px-5 pb-4 pt-0">
          <div className="flex items-end gap-4 -mt-10">
            <div className="relative">
              <div className="relative size-20 md:size-24 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] bg-muted overflow-hidden">
                <OptimizedRemoteImage
                  src={profileImg || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                  alt="Avatar"
                  fill
                  sizes="96px"
                  blurDataUrl={profileImg ? profileImgBlurDataUrl : null}
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setProfilePicDialogOpen(true)}
                className={cn(settingsBtnIconFab, 'absolute -right-1 -bottom-1 size-7')}
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
      <section className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Basic information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your display name"
              minLength={1}
              maxLength={100}
              className="w-full p-3 border-2 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm transition-shadow"
              aria-describedby="fullname-hint"
            />
            <p id="fullname-hint" className="text-[9px] text-muted-foreground">1–100 characters</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. johndoe"
              minLength={2}
              maxLength={30}
              className="w-full p-3 border-2 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm transition-shadow"
              aria-describedby="username-hint"
            />
            <p id="username-hint" className="text-[9px] text-muted-foreground">2–30 characters. Unique, letters and numbers only. No spaces.</p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Short bio</label>
          <p className="text-[9px] text-muted-foreground">Use the toolbar for <strong>bold</strong>, <em>italic</em>, underline. Text in the box shows formatting as you type.</p>
          <div className="border-2 border-border bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-shadow">
            <ToggleGroup
              type="multiple"
              value={[formatActive.bold && 'bold', formatActive.italic && 'italic', formatActive.underline && 'underline'].filter(Boolean) as string[]}
              onValueChange={() => {}}
              className="w-full justify-start border-0 border-b-2 border-border bg-muted/30 p-1 shadow-none flex-wrap gap-0 [&_button[data-state=on]]:bg-muted [&_button[data-state=on]]:text-foreground"
            >
              <ToggleGroupItem value="bold" aria-label="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => applyBioFormat('bold')}>
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => applyBioFormat('italic')}>
                <Italic className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => applyBioFormat('underline')}>
                <Underline className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => applyBioList('bullet')}>
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="numbered" aria-label="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => applyBioList('numbered')}>
                <ListOrdered className="h-4 w-4" />
              </ToggleGroupItem>
              <div className="relative inline-flex" ref={symbolsRef}>
                <ToggleGroupItem
                  value="symbols"
                  aria-label="Insert symbol"
                  aria-expanded={symbolsOpen}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSymbolsOpen((o) => !o)}
                  className={symbolsOpen ? 'bg-muted' : ''}
                >
                  <Sigma className="h-4 w-4" />
                </ToggleGroupItem>
                {symbolsOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] border-2 border-border bg-card p-2 shadow-lg">
                    <p className="mb-2 text-[9px] font-bold uppercase text-muted-foreground">Insert symbol</p>
                    <div className="grid grid-cols-5 gap-1">
                      {BIO_SYMBOLS.map((sym, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => insertBioSymbol(sym)}
                          className="flex h-8 w-8 items-center justify-center border-2 border-border bg-muted/30 text-sm font-medium hover:bg-muted hover:border-primary transition-colors"
                          title={sym}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ToggleGroup>
            <div
              ref={bioEditorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Short bio"
              aria-describedby="bio-char-count"
              data-placeholder="Tell the world what you're building..."
              data-max-length={BIO_MAX_LENGTH}
              onInput={handleBioInput}
              onPaste={handleBioPaste}
              onFocus={updateFormatState}
              onBlur={() => setFormatActive({ bold: false, italic: false, underline: false })}
              className="min-h-[4.5rem] w-full p-3 border-0 focus:ring-0 focus:outline-none font-medium text-sm resize-none bg-transparent empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:list-item"
            />
            <p id="bio-char-count" className="text-right text-[9px] text-muted-foreground px-3 pb-2">
              {bio.length} / {BIO_MAX_LENGTH}
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio URL — card */}
      <section className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-border bg-muted/30">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Portfolio URL</h3>
            <p className="text-[9px] font-medium text-muted-foreground/80">Showcase your work with a single link.</p>
          </div>
        </div>
        <div className="relative flex items-center">
          <input
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://your-portfolio.com"
            maxLength={500}
            className={cn(
              'w-full border-2 border-border bg-background py-3 pr-10 pl-3 font-medium text-sm outline-none transition-colors',
              'placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20'
            )}
            aria-label="Portfolio URL"
          />
          {portfolioUrl.trim() && (
            <a
              href={portfolioUrl.trim().startsWith('http') ? portfolioUrl.trim() : `https://${portfolioUrl.trim()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-2.5 flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
              aria-label="Open portfolio"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </section>

      {/* Social links — card */}
      <section className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-border bg-muted/30">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Social links</h3>
            <p className="text-[9px] font-medium text-muted-foreground/80">Add your profiles so others can find you.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'linkedin' as const, label: 'LinkedIn', value: linkedin, set: setLinkedin, placeholder: 'https://linkedin.com/in/username', Icon: Linkedin, iconBg: 'bg-[#0A66C2]/10', iconColor: 'text-[#0A66C2]' },
            { key: 'github' as const, label: 'GitHub', value: github, set: setGithub, placeholder: 'https://github.com/username', Icon: Github, iconBg: 'bg-foreground/10', iconColor: 'text-foreground' },
            { key: 'instagram' as const, label: 'Instagram', value: instagram, set: setInstagram, placeholder: 'https://instagram.com/username', Icon: Instagram, iconBg: 'bg-[#E4405F]/10', iconColor: 'text-[#E4405F]' },
            { key: 'youtube' as const, label: 'YouTube', value: youtube, set: setYoutube, placeholder: 'https://youtube.com/@channel', Icon: Youtube, iconColor: 'text-[#FF0000]', iconBg: 'bg-[#FF0000]/10' },
          ].map(({ key, label, value, set, placeholder, Icon, iconBg, iconColor }) => (
            <div key={key} className="group space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center border-2 border-border', iconBg, iconColor)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </label>
              <div className="relative flex items-center">
                <input
                  type={key === 'instagram' ? 'text' : 'url'}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  maxLength={500}
                  className={cn(
                    'w-full border-2 border-border bg-background py-3 pr-10 pl-3 font-medium text-sm outline-none transition-colors',
                    'placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20'
                  )}
                  aria-label={label}
                />
                {value.trim() && (
                  <a
                    href={value.trim().startsWith('http') ? value.trim() : `https://${value.trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                    aria-label={`Open ${label}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => refreshUser()} className="px-5 py-2.5 font-bold text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors border-2 border-transparent hover:border-border">
          Reset
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className={cn(settingsBtnPrimary, settingsBtnShadowLg, 'px-6 py-2.5 text-[11px] tracking-widest disabled:opacity-60')}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function SecurityEmailContent() {
  const { user, token, refreshUser } = useAuthStore();
  const [newEmail, setNewEmail] = useState('');
  const [codeCurrent, setCodeCurrent] = useState('');
  const [codeNew, setCodeNew] = useState('');
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
      toast.success('Verification codes dispatched.');
      setStep('verify');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send code.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (codeCurrent.length !== 6 || codeNew.length !== 6) {
      toast.error('Both 6-digit codes are required.');
      return;
    }
    if (!token) return;
    setVerifying(true);
    try {
      await authApi.verifyEmailChange(token, codeCurrent, codeNew);
      toast.success('Identity updated. Please re-link your accounts.');
      setStep('enter');
      setNewEmail('');
      setCodeCurrent('');
      setCodeNew('');
      await refreshUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelEmailChange = async () => {
    if (token) {
      try {
        await authApi.cancelEmailChange(token);
        toast.info('Update email cancelled. Codes are invalid; request new codes to try again.');
      } catch {
        // Still clear local state so user can re-init
        toast.info('Update email cancelled. Request new codes to try again.');
      }
    }
    setStep('enter');
    setCodeCurrent('');
    setCodeNew('');
  };

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Security Protocol: Email</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Authorized personnel only. Changing your primary email requires dual-factor verification.
          </p>
        </div>
        <div className="hidden md:flex gap-1">
          <div className={cn("px-2 py-1 text-[9px] font-black border-2 transition-colors", step === 'enter' ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>01. INITIATE</div>
          <div className={cn("px-2 py-1 text-[9px] font-black border-2 transition-colors", step === 'verify' ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>02. VERIFY</div>
        </div>
      </header>

      <div className="border-4 border-border bg-muted/5 p-6 space-y-6">
        {step === 'enter' ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Current Primary Email</Label>
                <div className="p-3 border-2 border-border bg-muted/20 font-mono text-sm opacity-70 italic">
                  {user?.email}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Destination Email</Label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full p-3 border-2 border-primary bg-background focus:ring-4 focus:ring-primary/10 outline-none font-mono text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending || !newEmail}
              className={cn(settingsBtnPrimary, settingsBtnShadowLg, 'px-6 py-3 text-xs tracking-widest')}
            >
              {sending ? 'Processing...' : 'Request Verification Codes'}
              <ChevronDown className="-rotate-90 size-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Box 1 */}
              <div className="p-4 border-2 border-border bg-background space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Input Code: Current Email</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={codeCurrent}
                  onChange={(e) => setCodeCurrent(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full p-4 border-2 border-border bg-muted/10 text-center font-mono text-2xl tracking-[0.5em] focus:border-primary focus:bg-background outline-none transition-all"
                />
                <p className="text-[9px] text-muted-foreground text-center">Check: {user?.email}</p>
              </div>

              {/* Box 2 */}
              <div className="p-4 border-2 border-primary/50 bg-background space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Input Code: New Email</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={codeNew}
                  onChange={(e) => setCodeNew(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full p-4 border-2 border-primary text-center font-mono text-2xl tracking-[0.5em] focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                />
                <p className="text-[9px] text-muted-foreground text-center">Check: {newEmail}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className={cn(settingsBtnPrimary, settingsBtnShadowLg, 'flex-1 py-4 text-sm tracking-widest')}
              >
                {verifying ? 'Verifying Identity...' : 'Confirm Email Change'}
              </button>
              <button
                type="button"
                onClick={handleCancelEmailChange}
                className={settingsBtnSecondaryWide}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-2 border-dashed border-border bg-muted/5 flex gap-4 items-start">
        <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong>Security Note:</strong> Changing your email is a high-level action. Upon successful update, all current OAuth sessions (Google, GitHub, etc.) will be terminated for your protection. You must re-authenticate using the new credentials.
        </p>
      </div>
    </div>
  );
}

function ConnectedAccountsContent() {
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
    { id: 'google', label: 'Google Cloud', linked: user?.isGoogleAccount, color: '#4285F4' },
    { id: 'github', label: 'GitHub Source', linked: user?.isGitAccount, color: '#24292F' },
    { id: 'x', label: 'X (Twitter)', linked: user?.isXAccount, color: '#000000' },
    { id: 'facebook', label: 'Meta / FB', linked: user?.isFacebookAccount, color: '#1877F2' },
    { id: 'discord', label: 'Discord', linked: user?.isDiscordAccount, color: '#5865F2' },
  ] as const;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Connected Nodes</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Manage your external authentication modules.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => {
          const Icon = PROVIDER_ICONS[p.id] ?? Plug;
          return (
            <div
              key={p.id}
              className={cn(
                "group relative border-4 p-5 transition-all",
                p.linked ? "border-primary bg-primary/5 shadow-[4px_4px_0px_0px_var(--border)]" : "border-border bg-background"
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
                <div className={cn(
                  "size-12 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                  p.linked ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"
                )}>
                  {p.id === 'google' ? (
                    <span className="flex items-center justify-center rounded-full bg-white p-1.5">
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
                  className="w-full py-2 border-2 border-black bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
                >
                  {linkingProvider === p.id ? 'REDIRECTING...' : 'Establish Link'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StackToolIcon({ name }: { name: string }) {
  const [imgError, setImgError] = useState(false);
  const src = getSkillIconUrl(name);
  if (!src || imgError) {
    return <Tag className="size-4 text-muted-foreground" />;
  }
  return (
    <img
      src={src}
      alt=""
      className="size-full object-contain"
      onError={() => setImgError(true)}
    />
  );
}

function StackAndToolsContent() {
  const { user, updateProfile } = useAuthStore();
  const [items, setItems] = useState<string[]>(
    () => (user?.stackAndTools ?? []).slice(0, STACK_AND_TOOLS_MAX)
  );
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const suggestions = useMemo(() => searchTechStack(input, 12), [input]);
  const atMax = items.length >= STACK_AND_TOOLS_MAX;
  const showSuggestions = open && input.trim().length >= 2 && !atMax;

  useEffect(() => {
    setItems((user?.stackAndTools ?? []).slice(0, STACK_AND_TOOLS_MAX));
  }, [user?.stackAndTools]);

  const addByName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setInput('');
      setOpen(false);
      setHighlight(0);
      return;
    }
    if (items.length >= STACK_AND_TOOLS_MAX) {
      toast.error(`You can add up to ${STACK_AND_TOOLS_MAX} languages and tools.`);
      return;
    }
    if (items.includes(trimmed)) {
      setInput('');
      setOpen(false);
      setHighlight(0);
      return;
    }
    setItems([...items, trimmed]);
    toast.success(`${trimmed} added to arsenal.`);
    setInput('');
    setOpen(false);
    setHighlight(0);
  };

  const selectSuggestion = (item: TechStackItem) => {
    addByName(item.name);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ stackAndTools: items.slice(0, STACK_AND_TOOLS_MAX) });
      toast.success('Stack & Tools Synchronized.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed.');
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        const v = input.trim();
        if (v) addByName(v);
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
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 ">
          <Monitor className="size-5 text-primary" strokeWidth={2.5} />
          <h2 className="text-2xl font-black uppercase tracking-tighter">Stack & Tools</h2>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          Search and add up to {STACK_AND_TOOLS_MAX} languages, frameworks, and tools.
        </p>
      </header>

      <div className="border-4 border-border bg-muted/5 p-6 space-y-8">
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Modules</h3>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence mode="popLayout">
              {items.map((t, i) => (
                <motion.div
                  key={t}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                  className="group flex items-center gap-2 pl-2 pr-1 py-1 border-2 border-border bg-card shadow-[3px_3px_0px_0px_var(--border)] hover:border-primary transition-colors"
                >
                  <div className="size-5 shrink-0 flex items-center justify-center">
                    <StackToolIcon name={t} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider">{t}</span>
                  <button
                    type="button"
                    onClick={() => setRemoveConfirmIndex(i)}
                    className="ml-1 p-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {items.length === 0 && (
              <div className="w-full py-4 px-4 border-2 border-dashed border-border bg-muted/10 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">No modules initialized. Use the search below.</p>
              </div>
            )}
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -top-3 left-4 px-2 bg-background z-10">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Module_Search</span>
          </div>
          <div className="flex items-center border-4 border-border bg-background focus-within:border-primary transition-colors">
            <div className="pl-4 pr-2">
              <Search className="size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              value={input}
              disabled={atMax}
              onChange={(e) => {
                setInput(e.target.value);
                setOpen(true);
                setHighlight(0);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
              onKeyDown={onKeyDown}
              placeholder={
                atMax
                  ? `MAX ${STACK_AND_TOOLS_MAX} — REMOVE ONE TO ADD MORE`
                  : 'E.G. REACT, TYPESCRIPT, DOCKER...'
              }
              className="w-full py-4 px-2 bg-transparent font-mono text-xs font-bold uppercase tracking-widest outline-none placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="pr-4 hidden md:block">
              <kbd className="px-1.5 py-0.5 border-2 border-border bg-muted text-[8px] font-black uppercase">Enter</kbd>
            </div>
          </div>

          <AnimatePresence>
            {showSuggestions && (
              <motion.ul
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute z-50 left-0 right-0 mt-3 border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)] max-h-72 overflow-y-auto divide-y-2 divide-border"
              >
                {suggestions.map((item, i) => (
                  <li key={`${item.slug}-${i}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(item);
                      }}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        'w-full flex items-center gap-4 px-4 py-3 text-left transition-colors group/item',
                        i === highlight ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'size-10 p-1.5 border-2 shrink-0 bg-background',
                        i === highlight ? 'border-primary-foreground' : 'border-border'
                      )}>
                        <img
                          src={getSkillIconUrlBySlug(item.slug)}
                          alt=""
                          className="size-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black uppercase tracking-tighter truncate">{item.name}</p>
                        <p className={cn(
                          'text-[9px] font-bold uppercase tracking-widest',
                          i === highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}>
                          {item.category}
                        </p>
                      </div>
                      <Plus className={cn(
                        'size-4 shrink-0 transition-transform',
                        i === highlight ? 'scale-110 rotate-0' : 'scale-100 opacity-0 group-hover/item:opacity-100'
                      )} />
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          Total modules: {items.length} / {STACK_AND_TOOLS_MAX}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(settingsBtnPrimary, settingsBtnShadowLg, 'px-8 py-3 text-xs tracking-[0.15em]')}
        >
          {saving ? 'SYNCING...' : 'COMMIT ARSENAL'}
          <Check className="size-4" />
        </button>
      </div>

      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="DE-INITIALIZE MODULE?"
        message={`Are you sure you want to remove ${removeConfirmIndex !== null ? items[removeConfirmIndex] : ''} from your tech stack?`}
        confirmLabel="REMOVE"
        variant="danger"
        onConfirm={() => {
          if (removeConfirmIndex !== null) {
            setItems(items.filter((_, idx) => idx !== removeConfirmIndex));
            setRemoveConfirmIndex(null);
          }
        }}
      />
    </div>
  );
}

function MySetupContent() {
  const { user, updateProfile, token } = useAuthStore();
  const [items, setItems] = useState<MySetupItem[]>((user as any)?.mySetup ?? []);
  const [saving, setSaving] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftProductUrl, setDraftProductUrl] = useState('');
  const [draftImageUrl, setDraftImageUrl] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const canSaveDraft = Boolean(draftLabel.trim()) && Boolean(draftImageUrl.trim());

  const normalizeUrl = (raw: string) => {
    const v = (raw ?? '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const onAddOrUpdate = async () => {
    if (!canSaveDraft) return;
    const nextItem = {
      label: draftLabel.trim().slice(0, 80),
      imageUrl: draftImageUrl.trim().slice(0, 500),
      productUrl: normalizeUrl(draftProductUrl).slice(0, 500),
    };
    const next = [...items];
    if (editIndex !== null) next[editIndex] = nextItem;
    else next.push(nextItem);

    setSaving(true);
    try {
      await updateProfile({ mySetup: next.slice(0, 5) } as any);
      setItems(next.slice(0, 5));
      setDraftLabel(''); setDraftImageUrl(''); setDraftProductUrl(''); setEditIndex(null);
      toast.success('My Setup updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update setup.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" />
            <h2 className="text-2xl font-black uppercase tracking-tighter">My Setup</h2>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Configure your physical workstation components (Max 5 slots).
          </p>
        </div>
     
      </header>

      <div className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)] overflow-hidden">
        <div className="bg-muted/40 text-foreground px-4 py-2 flex items-center justify-between border-b-2 border-border">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            {editIndex !== null ? `EDITING_SLOT_0${editIndex + 1}` : 'INITIALIZE_NEW_HARDWARE'}
          </span>
          <div className="flex gap-1">
            <div className="size-2 bg-destructive" />
            <div className="size-2 bg-muted-foreground/60" />
            <div className="size-2 bg-primary" />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Label</label>
              <input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="Ex: LG UltraWide 34&quot;"
                className="w-full p-3 border-2 border-border bg-muted/20 font-bold text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source Link</label>
              <input
                value={draftProductUrl}
                onChange={(e) => setDraftProductUrl(e.target.value)}
                placeholder="https://amazon.com/..."
                className="w-full p-3 border-2 border-border bg-muted/20 font-bold text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              {draftImageUrl ? (
                <div className="size-10 border-2 border-primary overflow-hidden">
                  <img src={draftImageUrl} alt="" className="size-full object-cover" />
                </div>
              ) : <ImagePlus className="size-5 text-muted-foreground group-hover:text-primary" />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {draftImageUrl ? 'Replace Component Image' : 'Upload Component Image'}
              </span>
            </button>

            <div className="flex-1" />

            {editIndex !== null && (
              <button
                type="button"
                onClick={() => { setEditIndex(null); setDraftLabel(''); setDraftImageUrl(''); setDraftProductUrl(''); }}
                className="text-[10px] font-black uppercase tracking-widest underline underline-offset-4 hover:text-primary"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              disabled={!canSaveDraft || (items.length >= 5 && editIndex === null)}
              onClick={onAddOrUpdate}
              className={cn(settingsBtnPrimary, settingsBtnShadowLg, 'w-full md:w-auto px-10 py-3 text-xs tracking-widest')}
            >
              {saving ? 'PROCESSING...' : editIndex !== null ? 'UPDATE COMPONENT' : 'MOUNT COMPONENT'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {items.map((it, idx) => (
            <motion.div
              key={idx}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] hover:border-primary transition-colors overflow-hidden"
            >
              <div className="aspect-video relative overflow-hidden border-b-4 border-border">
                <img src={it.imageUrl} alt={it.label} className="size-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                <div className="absolute top-2 left-2 px-2 py-1 bg-background/90 text-foreground border border-border text-[8px] font-black tracking-widest">
                  SLOT_0{idx + 1}
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-sm font-black uppercase truncate">{it.label}</h4>
                <div className="flex items-center gap-4 mt-4">
                  <button
                    type="button"
                    onClick={() => { setEditIndex(idx); setDraftLabel(it.label); setDraftImageUrl(it.imageUrl); setDraftProductUrl(it.productUrl || ''); }}
                    className="p-2 border-2 border-border hover:bg-muted transition-colors"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = items.filter((_, i) => i !== idx);
                      setSaving(true);
                      updateProfile({ mySetup: next } as any)
                        .then(() => {
                          setItems(next);
                          toast.success('Component removed.');
                        })
                        .catch((e) => {
                          toast.error(e instanceof Error ? e.message : 'Failed to remove component.');
                        })
                        .finally(() => setSaving(false));
                    }}
                    className="p-2 border-2 border-border hover:text-destructive hover:border-destructive transition-colors"
                  >
                    <Trash2 className="size-3" />
                  </button>
                  {it.productUrl && (
                    <a href={it.productUrl} target="_blank" rel="noreferrer" className="ml-auto text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-primary">
                      LINK <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="col-span-full py-12 border-4 border-dashed border-border bg-muted/5 flex flex-col items-center justify-center">
            <Monitor className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hardware inventory empty.</p>
          </div>
        )}
      </div>

      <UploadMediaDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        token={token ?? ''}
        onSuccess={(item) => {
          setDraftImageUrl(item.url);
          setUploadOpen(false);
        }}
      />
    </div>
  );
}

type MediaItem = { url: string; title?: string; altText?: string };

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

function domainFromUrl(url: string): string {
  const u = (url ?? '').trim();
  if (!u) return '';
  try {
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    return new URL(withProto).host;
  } catch {
    return u.replace(/^https?:\/\//i, '').split('/')[0] || u;
  }
}

/** Inline media thumbnail for list rows (thumbnail + label beside, no wrap). */
function MediaThumbnailRow({
  item,
  onRemove,
  onPreview,
}: {
  item: MediaItem;
  onRemove?: () => void;
  onPreview?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  if (!item || !item.url) return null;
  const fallbackText = item.altText || item.title || 'Image';
  const isImage = isImageUrl(item.url);
  const linkDomain = !isImage ? domainFromUrl(item.url) : '';

  return (
    <li className="flex items-center gap-2 p-2 border-2 border-border bg-muted/20">
      {isImage && !imgError ? (
        <button
          type="button"
          onClick={onPreview}
          className="size-12 border-2 border-border shrink-0 overflow-hidden focus:ring-2 focus:ring-primary"
        >
          <img src={item.url} alt={item.altText ?? item.title ?? ''} className="size-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; setImgError(true); }} />
        </button>
      ) : isImage && imgError ? (
        <div className="size-12 border-2 border-border bg-muted/30 shrink-0 flex items-center justify-center p-1">
          <span className="text-[9px] font-bold text-muted-foreground text-center leading-tight line-clamp-2" title={fallbackText}>{fallbackText}</span>
        </div>
      ) : (
        <HoverCard
          content={<LinkPreviewCardContent domain={linkDomain || item.url} title={item.title} />}
          side="top"
          align="start"
          contentClassName="w-[280px] p-0"
        >
          <div className="size-12 border-2 border-border bg-muted flex items-center justify-center shrink-0">
            <Link2 className="size-5 text-muted-foreground" />
          </div>
        </HoverCard>
      )}
      <div className="min-w-0 flex-1">
        {item.title && <p className="text-xs font-bold truncate">{item.title}</p>}
        <p className="text-[10px] text-muted-foreground truncate">{item.url}</p>
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="p-2 border-2 border-border hover:bg-muted shrink-0" aria-label="Remove media">
          <Trash2 className="size-4 text-muted-foreground" />
        </button>
      )}
    </li>
  );
}

type PromotionForm = {
  jobTitle: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  currentPosition: boolean;
  mediaItems: MediaItem[];
};

type WorkExpForm = {
  jobTitle: string;
  employmentType: string;
  company: string;
  companyDomain: string;
  companyLogo: string;
  currentPosition: boolean;
  startDate: string;
  endDate: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  location: string;
  locationType: string;
  locationCountry: string;
  locationState: string;
  locationCity: string;
  description: string;
  skills: string[];
  /** Promotions at the same company (timeline: initial role then 1, 2, 3...). */
  promotions: PromotionForm[];
  mediaItems: MediaItem[];
};

const PROMOTION_DEFAULT: PromotionForm = {
  jobTitle: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  currentPosition: false,
  mediaItems: [],
};

const WORK_EXP_DEFAULT: WorkExpForm = {
  jobTitle: '',
  employmentType: '',
  company: '',
  companyDomain: '',
  companyLogo: '',
  currentPosition: false,
  startDate: '',
  endDate: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  location: '',
  locationType: '',
  locationCountry: '',
  locationState: '',
  locationCity: '',
  description: '',
  skills: [],
  promotions: [],
  mediaItems: [],
};

const EMPLOYMENT_TYPE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
  'Volunteer',
  'Self-employed',
  'Temporary',
  'Other',
].map((label) => ({ value: label, label }));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const START_YEAR = 1980;
const END_YEAR = new Date().getFullYear();
const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }));
const YEAR_OPTIONS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => {
  const y = END_YEAR - i;
  return { value: String(y), label: String(y) };
});

function yearOptionsFrom(minYear: string | undefined) {
  const n = parseInt(minYear ?? '', 10);
  if (!Number.isFinite(n)) return YEAR_OPTIONS;
  const min = Math.max(START_YEAR, Math.min(END_YEAR, n));
  return YEAR_OPTIONS.filter((o) => parseInt(o.value, 10) >= min);
}

function monthYearToValue(month: string, year: string): string {
  if (!month || !year) return '';
  return `${year}-${month}`;
}
function valueToMonthYear(val: string): { month: string; year: string } {
  if (!val || val.length < 7) return { month: '', year: '' };
  const [y, m] = val.split('-');
  return { month: m ?? '', year: y ?? '' };
}

/** Format "2024-01" -> "Jan 2024" for display. */
function formatMonthYear(val: string): string {
  if (!val || val.length < 7) return '';
  const [y, m] = val.split('-');
  const monthNum = parseInt(m ?? '', 10);
  if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) return val;
  const short = MONTHS[monthNum - 1].slice(0, 3);
  return `${short} ${y}`;
}

/** Strip all work arrangement parts like "(On-site)" or "(Remote)" from location string (handles duplicated/legacy data). */
function locationWithoutType(location: string | undefined): string {
  if (!location?.trim()) return '';
  return location.trim().replace(/\s*\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
}

/** Normalize domain for display and iframe (add https if missing). */
function normalizeDomain(domain: string | undefined): string {
  if (!domain?.trim()) return '';
  const d = domain.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return d ? `https://${d}` : '';
}

type WorkExpFilledPromo = { p: PromotionForm; idx: number };

function getFilledWorkExpPromotions(form: WorkExpForm): WorkExpFilledPromo[] {
  return form.promotions
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.jobTitle.trim());
}

function collectWorkExpRequiredFieldErrors(form: WorkExpForm, startDateVal: string): Record<string, string> {
  const err: Record<string, string> = {};
  if (!form.jobTitle.trim()) err.jobTitle = 'Job title is required.';
  if (!form.employmentType.trim()) err.employmentType = 'Employment type is required.';
  if (!form.company.trim()) err.company = 'Company or organization is required.';
  if (!startDateVal) err.startDate = 'Start date is required.';
  if (!form.locationType.trim()) err.locationType = 'Work arrangement is required.';
  if (form.skills.filter(Boolean).length < 1) err.skills = 'At least 1 skill is required.';
  return err;
}

function workExpEndDateFieldErrors(form: WorkExpForm, startDateVal: string): Record<string, string> {
  if (form.currentPosition) return {};
  const endDateVal = monthYearToValue(form.endMonth, form.endYear);
  if (!endDateVal) return { endDate: 'End date is required when not currently working here.' };
  if (startDateVal && endDateVal < startDateVal) return { endDate: 'End date cannot be earlier than start date.' };
  return {};
}

function workExpMidPromotionNeedsEndDate(isLastPromo: boolean, promoEnd: string): boolean {
  return !isLastPromo && !promoEnd;
}

function workExpPromotionValidationError(filledPromos: WorkExpFilledPromo[]): string | null {
  for (let j = 0; j < filledPromos.length; j++) {
    const { p, idx } = filledPromos[j];
    const promoStart = monthYearToValue(p.startMonth, p.startYear);
    if (!promoStart) return `Promotion ${idx + 1}: start date is required.`;
    const isLastPromo = j === filledPromos.length - 1;
    const promoEnd = monthYearToValue(p.endMonth, p.endYear);
    if (workExpMidPromotionNeedsEndDate(isLastPromo, promoEnd)) {
      return `Promotion ${idx + 1}: end date is required (the previous role can’t be “Present” when you add a newer role).`;
    }
    if (promoEnd && promoEnd < promoStart) {
      return `Promotion ${idx + 1}: end date cannot be earlier than start date.`;
    }
  }
  return null;
}

function workExpJobEndAfterLatestPromotionMessage(form: WorkExpForm, filledPromos: WorkExpFilledPromo[]): string | undefined {
  if (form.currentPosition || filledPromos.length === 0) return undefined;
  const jobEnd = monthYearToValue(form.endMonth, form.endYear);
  const latestPromoEnd = filledPromos
    .map(({ p }) => monthYearToValue(p.endMonth, p.endYear))
    .filter(Boolean)
    .sort()
    .pop();
  if (!latestPromoEnd || !jobEnd || jobEnd >= latestPromoEnd) return undefined;
  return 'Employment end date must be on/after the last promotion end date.';
}

function mapWorkExpPromotionsForSubmit(form: WorkExpForm) {
  const trimmed = form.promotions.filter((p) => p.jobTitle.trim());
  const count = trimmed.length;
  return trimmed
    .map((p, i) => {
      const promoEndVal = monthYearToValue(p.endMonth, p.endYear);
      const isLast = i === count - 1;
      const currentPosition = isLast && !promoEndVal;
      return {
        jobTitle: p.jobTitle.trim(),
        startDate: monthYearToValue(p.startMonth, p.startYear) || undefined,
        endDate: currentPosition ? undefined : (promoEndVal || undefined),
        currentPosition,
        media: (p.mediaItems ?? [])
          .filter((m) => m.url.trim())
          .slice(0, 5)
          .map((m) => ({
            url: m.url.trim(),
            title: m.title?.trim() || undefined,
            altText: m.altText?.trim() || undefined,
          })),
      };
    })
    .slice(0, 5);
}

function buildWorkExperienceProfileEntry(
  form: WorkExpForm,
  startDateVal: string,
  endDateVal: string | undefined,
  promotionsVal: ReturnType<typeof mapWorkExpPromotionsForSubmit>
) {
  const locationStr = buildLocationString(form.locationCity, form.locationState, form.locationCountry);
  return {
    jobTitle: form.jobTitle.trim(),
    employmentType: form.employmentType.trim() || undefined,
    company: form.company.trim(),
    companyDomain: form.companyDomain.trim() || undefined,
    companyLogo: form.companyLogo.trim() || undefined,
    currentPosition: form.currentPosition,
    startDate: startDateVal,
    endDate: endDateVal,
    location: locationStr.trim().slice(0, 180) || undefined,
    locationType: form.locationType.trim() || undefined,
    description: form.description.trim().slice(0, 5000) || undefined,
    skills: form.skills.filter(Boolean).slice(0, 10),
    promotions: promotionsVal,
    media: form.mediaItems
      .filter((m) => m.url.trim())
      .slice(0, 5)
      .map((m) => ({
        url: m.url.trim(),
        title: m.title?.trim() || undefined,
        altText: m.altText?.trim() || undefined,
      })),
  };
}

const SETTINGS_LOGO_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);
const SETTINGS_LOGO_MAX_BYTES = 2 * 1024 * 1024;

type SettingsLogoUploadKind = 'company-logo' | 'school-logo' | 'org-logo';

/** School / company / issuer logo uploads share validation, field name, and JSON shape. */
async function postSettingsLogoUpload(
  file: File,
  token: string,
  kind: SettingsLogoUploadKind,
  applyUrl: (url: string) => void,
  setUploading: (busy: boolean) => void
): Promise<void> {
  if (!SETTINGS_LOGO_ALLOWED_MIME.has(file.type)) {
    toast.error('Logo must be JPEG, PNG, WebP, or SVG.');
    return;
  }
  if (file.size > SETTINGS_LOGO_MAX_BYTES) {
    toast.error('Logo must be under 2 MB.');
    return;
  }
  setUploading(true);
  try {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
    const fd = new FormData();
    fd.append('logo', file);
    const res = await fetch(`${apiBase}/api/upload/${kind}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (data.success && data.url) {
      applyUrl(data.url);
      toast.success('Logo uploaded.');
    } else {
      toast.error(data.message || 'Upload failed.');
    }
  } catch {
    toast.error('Logo upload failed.');
  } finally {
    setUploading(false);
  }
}

const LOCATION_TYPE_OPTIONS = [
  { value: '', label: 'Select work arrangement *' },
  { value: 'On-site', label: 'On-site' },
  { value: 'Remote', label: 'Remote' },
  { value: 'Hybrid', label: 'Hybrid' },
];

function WorkExperiencesContent() {
  const { user, updateProfile, token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const list = (user?.workExperiences ?? []).map((w) => {
    const mediaItems: MediaItem[] = (w.media && w.media.length > 0)
      ? w.media.map((m) => ({ url: m.url, title: m.title, altText: m.altText }))
      : (w.mediaUrls ?? []).map((url) => ({ url }));
    const raw = w as { promotions?: Array<{ jobTitle?: string; startDate?: string; endDate?: string; currentPosition?: boolean; media?: { url: string; title?: string; altText?: string }[] }>; promotion?: { jobTitle?: string; startDate?: string; endDate?: string; currentPosition?: boolean } };
    const promotionsList = Array.isArray(raw.promotions) && raw.promotions.length > 0
      ? raw.promotions
      : raw.promotion && raw.promotion.jobTitle ? [raw.promotion] : [];
    const promotions = promotionsList
      .filter((p) => p && p.jobTitle)
      .map((p) => ({
        jobTitle: p.jobTitle!,
        startDate: p.startDate,
        endDate: p.endDate,
        currentPosition: !!p.currentPosition,
        mediaItems: ((p as { media?: { url: string; title?: string; altText?: string }[] }).media ?? []).map((m) => ({ url: m.url, title: m.title, altText: m.altText })),
      }));
    return {
      jobTitle: w.jobTitle ?? w.role ?? '',
      employmentType: w.employmentType ?? '',
      company: w.company ?? '',
      companyDomain: w.companyDomain ?? '',
      companyLogo: (w as { companyLogo?: string }).companyLogo ?? '',
      currentPosition: !!w.currentPosition,
      startDate: w.startDate ?? '',
      endDate: w.endDate ?? '',
      location: w.location ?? '',
      locationType: w.locationType ?? '',
      description: w.description ?? '',
      skills: w.skills ?? [],
      promotions,
      mediaItems,
    };
  });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<WorkExpForm>(WORK_EXP_DEFAULT);
  const [initialForm, setInitialForm] = useState<WorkExpForm>(WORK_EXP_DEFAULT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [addMediaDropdownOpen, setAddMediaDropdownOpen] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [uploadMediaDialogOpen, setUploadMediaDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [fullViewMedia, setFullViewMedia] = useState<MediaItem | null>(null);
  const [listPreviewMedia, setListPreviewMedia] = useState<MediaItem | null>(null);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const [promoMediaDropdownIndex, setPromoMediaDropdownIndex] = useState<number | null>(null);
  const [promoMediaLinkIndex, setPromoMediaLinkIndex] = useState<number | null>(null);
  const [promoMediaUploadIndex, setPromoMediaUploadIndex] = useState<number | null>(null);
  const [promoLinkUrl, setPromoLinkUrl] = useState('');
  const [promoLinkTitle, setPromoLinkTitle] = useState('');
  const [promoFullViewMedia, setPromoFullViewMedia] = useState<{ pIdx: number; item: MediaItem } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const addMediaDropdownRef = useRef<HTMLDivElement>(null);
  const hasFormChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMediaDropdownRef.current && !addMediaDropdownRef.current.contains(e.target as Node)) {
        setAddMediaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAdd = () => {
    setForm(WORK_EXP_DEFAULT);
    setInitialForm(WORK_EXP_DEFAULT);
    setEditingIndex(null);
    setFieldErrors({});
    setShowLinkForm(false);
    setLinkUrl('');
    setLinkTitle('');
    setPromoMediaDropdownIndex(null);
    setPromoMediaLinkIndex(null);
    setPromoMediaUploadIndex(null);
    setPromoLinkUrl('');
    setPromoLinkTitle('');
    setPromoFullViewMedia(null);
    setDialogOpen(true);
  };
  const openEdit = (i: number) => {
    const e = list[i];
    const parsed = parseLocationString(e.location ?? '');
    const start = valueToMonthYear(e.startDate ?? '');
    const end = valueToMonthYear(e.endDate ?? '');
    const locType = e.locationType ?? '';
    const nextForm: WorkExpForm = {
      ...WORK_EXP_DEFAULT,
      jobTitle: e.jobTitle,
      employmentType: e.employmentType,
      company: e.company,
      companyDomain: e.companyDomain,
      companyLogo: e.companyLogo ?? '',
      currentPosition: e.currentPosition,
      startDate: e.startDate,
      endDate: e.endDate,
      startMonth: start.month,
      startYear: start.year,
      endMonth: end.month,
      endYear: end.year,
      location: e.location ?? '',
      locationType: locType,
      locationCountry: parsed.countryCode,
      locationState: parsed.stateCode,
      locationCity: parsed.city,
      description: e.description,
      skills: e.skills ?? [],
      promotions: (e.promotions ?? []).map((p) => ({
        jobTitle: p.jobTitle ?? '',
        startMonth: valueToMonthYear(p.startDate ?? '').month,
        startYear: valueToMonthYear(p.startDate ?? '').year,
        endMonth: valueToMonthYear(p.endDate ?? '').month,
        endYear: valueToMonthYear(p.endDate ?? '').year,
        currentPosition: !!p.currentPosition,
        mediaItems: (p.mediaItems ?? []).map((m) => ({ url: m.url, title: m.title, altText: m.altText })),
      })),
      mediaItems: e.mediaItems ?? [],
    };
    setForm(nextForm);
    setInitialForm(nextForm);
    setEditingIndex(i);
    setFieldErrors({});
    setShowLinkForm(false);
    setLinkUrl('');
    setLinkTitle('');
    setPromoMediaDropdownIndex(null);
    setPromoMediaLinkIndex(null);
    setPromoMediaUploadIndex(null);
    setPromoLinkUrl('');
    setPromoLinkTitle('');
    setPromoFullViewMedia(null);
    setDialogOpen(true);
  };
  const openedEditFromUrlRef = useRef(false);
  useEffect(() => {
    if (openedEditFromUrlRef.current || list.length === 0) return;
    const edit = searchParams.get('edit');
    if (edit == null) return;
    const idx = parseInt(edit, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    openedEditFromUrlRef.current = true;
    openEdit(idx);
    router.replace('/settings?section=work-experiences', { scroll: false });
  }, [list.length]);
  const remove = async (i: number) => {
    const next = list.filter((_, idx) => idx !== i);
    setSaving(true);
    try {
      await updateProfile({ workExperiences: next });
      toast.success('Removed.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };
  const submitDialog = async () => {
    const startDateVal = monthYearToValue(form.startMonth, form.startYear);
    const err: Record<string, string> = {
      ...collectWorkExpRequiredFieldErrors(form, startDateVal),
      ...workExpEndDateFieldErrors(form, startDateVal),
    };
    const filledPromos = getFilledWorkExpPromotions(form);
    const promoToast = workExpPromotionValidationError(filledPromos);
    if (promoToast) {
      toast.error(promoToast);
      return;
    }
    const jobVsPromoEnd = workExpJobEndAfterLatestPromotionMessage(form, filledPromos);
    if (jobVsPromoEnd) err.endDate = jobVsPromoEnd;

    if (Object.keys(err).length) {
      setFieldErrors(err);
      toast.error('Please fix the errors below.');
      return;
    }
    setFieldErrors({});
    const endDateVal = form.currentPosition ? undefined : monthYearToValue(form.endMonth, form.endYear) || undefined;
    const promotionsVal = mapWorkExpPromotionsForSubmit(form);
    const entry = buildWorkExperienceProfileEntry(form, startDateVal, endDateVal, promotionsVal);
    const next = editingIndex !== null ? list.map((e, i) => (i === editingIndex ? entry : e)) : [...list, entry];
    setSaving(true);
    try {
      await updateProfile({ workExperiences: next });
      toast.success(editingIndex !== null ? 'Updated.' : 'Added.');
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (file: File) => {
    if (!token) return;
    void postSettingsLogoUpload(
      file,
      token,
      'company-logo',
      (url) => setForm((f) => ({ ...f, companyLogo: url })),
      setLogoUploading
    );
  };

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !form.skills.includes(s) && form.skills.length < 30) setForm((f) => ({ ...f, skills: [...f.skills, s] }));
  };

  return (
    <div className="space-y-8">
      <SettingsSectionHeader variant="work" onPrimaryAction={openAdd} disabled={saving} />

      <div className="space-y-8">
        {list.length === 0 ? (
          <SettingsSectionEmptyState
            icon={Briefcase}
            title="Empty Resume"
            tagline="You haven't added any work experiences. Start by adding your current or past roles."
            addLabel="Add Experience"
            onAdd={openAdd}
          />
        ) : (
          <>
            {list.map((e, i) => {
              return (
                <WorkExperienceCard
                  key={i}
                  experience={e}
                  index={i}
                  saving={saving}
                  onEdit={() => openEdit(i)}
                  onRemove={() => setRemoveConfirmIndex(i)}
                  onPreviewMedia={(item) => setListPreviewMedia(item)}
                  formatMonthYear={formatMonthYear}
                  locationWithoutType={locationWithoutType}
                  normalizeDomain={normalizeDomain}
                  isImageUrl={isImageUrl}
                />
              );
            })}
          </>
        )}
      </div>

      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="Delete Experience?"
        message="This will permanently remove this role from your profile. This action cannot be undone."
        confirmLabel="Destroy Record"
        variant="danger"
        loading={saving}
        onConfirm={() => { if (removeConfirmIndex !== null) { remove(removeConfirmIndex); setRemoveConfirmIndex(null); } }}
      />
      <MediaFullViewDialog
        open={!!listPreviewMedia}
        onClose={() => setListPreviewMedia(null)}
        src={listPreviewMedia?.url ?? ''}
        title={listPreviewMedia?.title}
        altText={listPreviewMedia?.altText}
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center justify-center size-8 border-2 border-primary/30 bg-primary/10 text-primary">
              <Briefcase className="size-4" />
            </span>
            {editingIndex !== null ? 'Edit Position' : 'Work experience'}
          </span>
        }
        titleId="work-dialog"
        subtitle="Provide the details of your professional journey."
        panelClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">* Required fields</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className={settingsBtnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDialog}
                disabled={saving || !hasFormChanged}
                className={cn(settingsBtnPrimary, settingsBtnShadowLg, 'px-6 py-2.5 text-xs tracking-wide')}
              >
                {saving ? 'Processing…' : hasFormChanged ? 'Confirm changes' : 'Save Milestone'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput id="we-job" label="Job title *" placeholder="Ex: Senior Frontend Engineer" maxLength={120} value={form.jobTitle} error={fieldErrors.jobTitle} onChange={(e) => { setForm((f) => ({ ...f, jobTitle: e.target.value })); if (fieldErrors.jobTitle) setFieldErrors((e2) => (e2.jobTitle ? { ...e2, jobTitle: '' } : e2)); }} />
          <SearchableSelect
            id="we-type"
            label="Employment type *"
            placeholder="Select type"
            value={form.employmentType}
            onChange={(v) => { setForm((f) => ({ ...f, employmentType: v })); if (fieldErrors.employmentType) setFieldErrors((e) => (e.employmentType ? { ...e, employmentType: '' } : e)); }}
            options={EMPLOYMENT_TYPE_OPTIONS}
            listMaxHeight={220}
            error={fieldErrors.employmentType}
          />
          <EntitySearchInput
            id="we-company"
            label="Company or organization *"
            placeholder="Type company name (e.g. Microsoft)"
            value={form.company}
            onChange={(v) => { setForm((f) => ({ ...f, company: v })); if (fieldErrors.company) setFieldErrors((e2) => (e2.company ? { ...e2, company: '' } : e2)); }}
            onDomainSelect={(d) => setForm((f) => ({ ...f, companyDomain: d }))}
            searchOptions={searchCompaniesWithApi}
            error={fieldErrors.company}
            maxLength={200}
          />
          <FormInput id="we-domain" label="Company domain (optional)" placeholder="Ex: company.com" maxLength={120} value={form.companyDomain} onChange={(e) => setForm((f) => ({ ...f, companyDomain: e.target.value }))} />
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Company logo (optional)</Label>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center border-2 border-border bg-muted/30 overflow-hidden">
                {form.companyLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.companyLogo} alt="Logo" className="size-full object-contain" onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} />
                ) : form.companyDomain ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://logo.clearbit.com/${form.companyDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '')}`} alt="" className="size-full object-contain" onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Building2 className="size-6 text-muted-foreground" />
                )}
              </span>
              <div className="flex gap-2">
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) handleLogoUpload(f); ev.target.value = ''; }} />
                <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploading} className="px-3 py-1.5 border-2 border-border text-[10px] font-bold uppercase hover:bg-muted/30 disabled:opacity-50">
                  {logoUploading ? 'Uploading…' : 'Upload logo'}
                </button>
                {form.companyLogo && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, companyLogo: '' }))} className="px-3 py-1.5 border-2 border-destructive text-destructive text-[10px] font-bold uppercase hover:bg-destructive/10">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">JPEG, PNG, WebP, or SVG. Max 2 MB. Resized to 128×128.</p>
          </div>
          <FormCheckbox
            id="we-current"
            label="I'm currently working here"
            checked={form.currentPosition}
            onCheckedChange={(v) =>
              setForm((f) => {
                if (v) return { ...f, currentPosition: true, endMonth: '', endYear: '' };
                const latestPromoEnd = f.promotions
                  .filter((p) => p.jobTitle.trim())
                  .map((p) => monthYearToValue(p.endMonth, p.endYear))
                  .filter(Boolean)
                  .sort()
                  .pop();
                const currEnd = monthYearToValue(f.endMonth, f.endYear);
                if (latestPromoEnd && (!currEnd || currEnd < latestPromoEnd)) {
                  const parts = valueToMonthYear(latestPromoEnd);
                  return { ...f, currentPosition: false, endMonth: parts.month, endYear: parts.year };
                }
                return { ...f, currentPosition: false };
              })
            }
          />
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t-2 border-border/50">
            <div className="w-full space-y-4">
              {form.promotions.map((promo, pIdx) => {
                const isLastPromo = pIdx === form.promotions.length - 1;
                const endDateRequired = !isLastPromo;
                return (
                  <div key={pIdx} className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                        <TrendingUp className="size-4" /> Promotion{form.promotions.length > 1 ? ` ${pIdx + 1}` : ''} — new position & dates
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, promotions: f.promotions.filter((_, i) => i !== pIdx) }))}
                        className="text-[10px] font-bold uppercase text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                    <FormInput id={`we-promo-title-${pIdx}`} label="New position *" placeholder="Ex: Senior Engineer" maxLength={120} value={promo.jobTitle} onChange={(e) => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, jobTitle: e.target.value } : p) }))} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Promotion start date *</Label>
                        <div className="flex gap-2">
                          <SearchableSelect id={`we-promo-start-month-${pIdx}`} label="" placeholder="Month" value={promo.startMonth} onChange={(v) => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, startMonth: v } : p) }))} options={MONTH_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                          <SearchableSelect
                            id={`we-promo-start-year-${pIdx}`}
                            label=""
                            placeholder="Year"
                            value={promo.startYear}
                            onChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                promotions: f.promotions.map((p, i) => {
                                  if (i !== pIdx) return p;
                                  const nextStartYear = v;
                                  const sy = parseInt(nextStartYear || '', 10);
                                  const ey = parseInt(p.endYear || '', 10);
                                  const nextEndYear = Number.isFinite(sy) && Number.isFinite(ey) && ey < sy ? nextStartYear : p.endYear;
                                  return { ...p, startYear: nextStartYear, endYear: nextEndYear };
                                }),
                              }))
                            }
                            options={YEAR_OPTIONS}
                            listMaxHeight={220}
                            widthClass="flex-1 min-w-0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">End date{endDateRequired ? ' *' : ' (optional for current role)'}</Label>
                        <div className="flex gap-2">
                          <SearchableSelect id={`we-promo-end-month-${pIdx}`} label="" placeholder="Month" value={promo.endMonth} onChange={(v) => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, endMonth: v } : p) }))} options={MONTH_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                          <SearchableSelect
                            id={`we-promo-end-year-${pIdx}`}
                            label=""
                            placeholder="Year"
                            value={promo.endYear}
                            onChange={(v) => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, endYear: v } : p) }))}
                            options={yearOptionsFrom(promo.startYear)}
                            listMaxHeight={220}
                            widthClass="flex-1 min-w-0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">Media (optional, max 5)</Label>
                      {promo.mediaItems.length > 0 && (
                        <ul className="space-y-2">
                          {promo.mediaItems.map((m, mi) => (
                            <MediaThumbnailRow
                              key={mi}
                              item={m}
                              onPreview={() => setPromoFullViewMedia({ pIdx, item: m })}
                              onRemove={() => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, mediaItems: p.mediaItems.filter((_, j) => j !== mi) } : p) }))}
                            />
                          ))}
                        </ul>
                      )}
                      {promo.mediaItems.length < 5 && (
                        <div className="relative">
                          {promoMediaDropdownIndex === pIdx && (
                            <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setPromoMediaDropdownIndex(null)} />
                          )}
                          <button
                            type="button"
                            onClick={() => setPromoMediaDropdownIndex((prev) => (prev === pIdx ? null : pIdx))}
                            className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border text-[10px] font-bold uppercase hover:bg-muted/30"
                          >
                            <Plus className="size-3" /> Add media
                            <ChevronDown className={cn('size-3 transition-transform', promoMediaDropdownIndex === pIdx && 'rotate-180')} />
                          </button>
                          {promoMediaDropdownIndex === pIdx && (
                            <div className="absolute left-0 top-full mt-1 z-[100] min-w-[200px] border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] py-1">
                              <button type="button" onClick={() => { setPromoMediaDropdownIndex(null); setPromoMediaLinkIndex(pIdx); setPromoLinkUrl(''); setPromoLinkTitle(''); }} className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50">
                                <Link2 className="size-4" /> Add link
                              </button>
                              <button type="button" onClick={() => { setPromoMediaDropdownIndex(null); setPromoMediaUploadIndex(pIdx); }} className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50">
                                <ImagePlus className="size-4" /> Upload media
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {promoMediaLinkIndex === pIdx && (
                        <div className="mt-2 p-3 border-2 border-border bg-muted/10 space-y-2 relative">
                          <button type="button" onClick={() => { setPromoMediaLinkIndex(null); setPromoLinkUrl(''); setPromoLinkTitle(''); }} className="absolute right-2 top-2 p-1 border-2 border-border text-muted-foreground hover:bg-muted" aria-label="Close">
                            <X className="size-4" />
                          </button>
                          <Label className="text-[10px] font-bold uppercase">Link URL</Label>
                          <Input type="url" placeholder="https://..." value={promoLinkUrl} onChange={(e) => setPromoLinkUrl(e.target.value)} className="text-sm" />
                          <Label className="text-[10px] font-bold uppercase">Title (optional)</Label>
                          <Input placeholder="e.g. Certificate" value={promoLinkTitle} onChange={(e) => setPromoLinkTitle(e.target.value)} className="text-sm" maxLength={120} />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setPromoMediaLinkIndex(null); setPromoLinkUrl(''); setPromoLinkTitle(''); }} className={settingsBtnSecondaryCompact}>Cancel</button>
                            <button
                              type="button"
                              onClick={() => {
                                const u = promoLinkUrl.trim();
                                if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
                                  setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, mediaItems: [...p.mediaItems, { url: u, title: promoLinkTitle.trim() || undefined }].slice(0, 5) } : p) }));
                                  setPromoLinkUrl(''); setPromoLinkTitle(''); setPromoMediaLinkIndex(null);
                                } else toast.error('Enter a valid URL.');
                              }}
                              className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-3 py-1.5 text-[10px] font-bold')}
                            >
                              Add link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, promotions: [...f.promotions, { ...PROMOTION_DEFAULT }].slice(0, 5) }))}
                disabled={form.promotions.length >= 5}
                className="inline-flex items-center gap-2 px-3 py-2 border-2 border-border bg-muted/30 font-bold text-[10px] uppercase tracking-wide hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <TrendingUp className="size-4" /> Add promotion (same company, new role)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Start date *</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  id="we-start-month"
                  label=""
                  placeholder="Month"
                  value={form.startMonth}
                  onChange={(v) => { setForm((f) => ({ ...f, startMonth: v })); if (fieldErrors.startDate) setFieldErrors((e2) => (e2.startDate ? { ...e2, startDate: '' } : e2)); }}
                  options={MONTH_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
                <SearchableSelect
                  id="we-start-year"
                  label=""
                  placeholder="Year"
                  value={form.startYear}
                  onChange={(v) => {
                    setForm((f) => {
                      const sy = parseInt(v || '', 10);
                      const ey = parseInt(f.endYear || '', 10);
                      const nextEndYear = Number.isFinite(sy) && Number.isFinite(ey) && ey < sy ? v : f.endYear;
                      return { ...f, startYear: v, endYear: nextEndYear };
                    });
                    if (fieldErrors.startDate) setFieldErrors((e2) => (e2.startDate ? { ...e2, startDate: '' } : e2));
                  }}
                  options={YEAR_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
              </div>
              {fieldErrors.startDate && <p className="text-xs text-destructive font-medium">{fieldErrors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">End date{!form.currentPosition ? ' *' : ''}</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  id="we-end-month"
                  label=""
                  placeholder="Month"
                  value={form.endMonth}
                  onChange={(v) => { setForm((f) => ({ ...f, endMonth: v })); if (fieldErrors.endDate) setFieldErrors((e) => (e.endDate ? { ...e, endDate: '' } : e)); }}
                  options={MONTH_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                  disabled={form.currentPosition}
                />
                <SearchableSelect
                  id="we-end-year"
                  label=""
                  placeholder="Year"
                  value={form.endYear}
                  onChange={(v) => { setForm((f) => ({ ...f, endYear: v })); if (fieldErrors.endDate) setFieldErrors((e) => (e.endDate ? { ...e, endDate: '' } : e)); }}
                  options={yearOptionsFrom(form.startYear)}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                  disabled={form.currentPosition}
                />
              </div>
              {fieldErrors.endDate && <p className="text-xs text-destructive font-medium">{fieldErrors.endDate}</p>}
              {form.currentPosition && !fieldErrors.endDate && <p className="text-[9px] text-muted-foreground">Disabled while currently working here</p>}
            </div>
          </div>
          <SearchableSelect
            id="we-location-type"
            label="Work arrangement *"
            placeholder="Select work arrangement *"
            value={form.locationType}
            onChange={(v) => { setForm((f) => ({ ...f, locationType: v })); if (fieldErrors.locationType) setFieldErrors((e) => (e.locationType ? { ...e, locationType: '' } : e)); }}
            options={LOCATION_TYPE_OPTIONS}
            listMaxHeight={180}
            error={fieldErrors.locationType}
          />
          <div className="flex flex-col gap-4">
            <SearchableSelect
              id="we-country"
              label="Country"
              placeholder="Select country"
              value={form.locationCountry}
              onChange={(v) => setForm((f) => ({ ...f, locationCountry: v, locationState: '', locationCity: '' }))}
              options={getCountryOptions()}
              listMaxHeight={200}
            />
            <SearchableSelect
              id="we-state"
              label="State / Region"
              placeholder="Select state"
              value={form.locationState}
              onChange={(v) => setForm((f) => ({ ...f, locationState: v, locationCity: '' }))}
              options={getStateOptions(form.locationCountry)}
              listMaxHeight={200}
              disabled={!form.locationCountry}
            />
            <SearchableSelect
              id="we-city"
              label="City"
              placeholder="Select city"
              value={form.locationCity}
              onChange={(v) => setForm((f) => ({ ...f, locationCity: v }))}
              options={getCityOptions(form.locationCountry, form.locationState)}
              listMaxHeight={200}
              disabled={!form.locationState}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Media (optional)</Label>
            <p className="text-[9px] text-muted-foreground">Add links or upload images (thumbnails). Max 5.</p>
            {form.mediaItems.length > 0 && (
              <ul className="space-y-2">
                {form.mediaItems.map((m, i) => (
                  <MediaThumbnailRow
                    key={i}
                    item={m}
                    onPreview={() => setFullViewMedia(m)}
                    onRemove={() => setForm((f) => ({ ...f, mediaItems: f.mediaItems.filter((_, j) => j !== i) }))}
                  />
                ))}
              </ul>
            )}
            <MediaFullViewDialog open={!!fullViewMedia} onClose={() => setFullViewMedia(null)} src={fullViewMedia?.url ?? ''} title={fullViewMedia?.title} altText={fullViewMedia?.altText} />
            {form.mediaItems.length < 5 && (
              <div className="relative" ref={addMediaDropdownRef}>
                {addMediaDropdownOpen && (
                  <div
                    className="fixed inset-0 z-[99]"
                    aria-hidden
                    onClick={() => setAddMediaDropdownOpen(false)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setAddMediaDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border text-[10px] font-bold uppercase hover:bg-muted/30"
                >
                  <Plus className="size-3" /> Add media
                  <ChevronDown className={cn('size-3 transition-transform', addMediaDropdownOpen && 'rotate-180')} />
                </button>
                {addMediaDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 z-[100] min-w-[200px] border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAddMediaDropdownOpen(false);
                        setShowLinkForm(true);
                        setLinkUrl('');
                        setLinkTitle('');
                      }}
                      className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"
                    >
                      <Link2 className="size-4" /> Add link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddMediaDropdownOpen(false);
                        setUploadMediaDialogOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"
                    >
                      <ImagePlus className="size-4" /> Upload media
                    </button>
                  </div>
                )}
                {showLinkForm && (
                  <div className="mt-2 p-3 border-2 border-border bg-muted/10 space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => { setShowLinkForm(false); setLinkUrl(''); setLinkTitle(''); }}
                      className="absolute right-2 top-2 p-1 border-2 border-border text-muted-foreground hover:bg-muted"
                      aria-label="Close"
                    >
                      <X className="size-4" />
                    </button>
                    <Label className="text-[10px] font-bold uppercase">Link URL</Label>
                    <Input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="text-sm" />
                    <Label className="text-[10px] font-bold uppercase">Title (optional)</Label>
                    <Input placeholder="e.g. Certificate" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} className="text-sm" maxLength={120} />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkForm(false);
                          setLinkUrl('');
                          setLinkTitle('');
                        }}
                        className="px-3 py-1.5 border-2 border-border text-[10px] font-bold uppercase"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const u = linkUrl.trim();
                          if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
                            setForm((f) => ({ ...f, mediaItems: [...f.mediaItems, { url: u, title: linkTitle.trim() || undefined }].slice(0, 5) }));
                            setLinkUrl('');
                            setLinkTitle('');
                            setShowLinkForm(false);
                          } else {
                            toast.error('Enter a valid URL.');
                          }
                        }}
                        className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-3 py-1.5 text-[10px] font-bold')}
                      >
                        Add link
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {token && (
            <>
              <UploadMediaDialog
                open={uploadMediaDialogOpen}
                onClose={() => setUploadMediaDialogOpen(false)}
                token={token}
                onSuccess={(item) => {
                  setForm((f) => ({ ...f, mediaItems: [...f.mediaItems, item].slice(0, 5) }));
                  setUploadMediaDialogOpen(false);
                }}
              />
              <UploadMediaDialog
                open={promoMediaUploadIndex !== null}
                onClose={() => setPromoMediaUploadIndex(null)}
                token={token}
                onSuccess={(item) => {
                  if (promoMediaUploadIndex !== null) {
                    setForm((f) => ({
                      ...f,
                      promotions: f.promotions.map((p, i) =>
                        i === promoMediaUploadIndex ? { ...p, mediaItems: [...p.mediaItems, item].slice(0, 5) } : p
                      ),
                    }));
                    setPromoMediaUploadIndex(null);
                  }
                }}
              />
            </>
          )}
          <MediaFullViewDialog
            open={!!promoFullViewMedia}
            onClose={() => setPromoFullViewMedia(null)}
            src={promoFullViewMedia?.item.url ?? ''}
            title={promoFullViewMedia?.item.title}
            altText={promoFullViewMedia?.item.altText}
          />
          <FormTextarea id="we-desc" label="Description — Key technologies, projects, achievements" placeholder="Key technologies, projects, and achievements" maxLength={5000} rows={5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 5000) }))} />
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="we-skills">Skills * (min 1)</Label>
            <Input
              id="we-skills"
              placeholder="Search skills. Add commas (,) or press Enter. Min 1, max 30."
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  const raw = input.value;
                  raw
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach(addSkill);
                  input.value = '';
                  if (fieldErrors.skills) setFieldErrors((e2) => (e2.skills ? { ...e2, skills: '' } : e2));
                }
              }}
              onBlur={(e) => {
                const v = e.target.value;
                if (v.includes(',')) {
                  v.split(',').forEach(addSkill);
                  e.target.value = '';
                  if (fieldErrors.skills) setFieldErrors((e2) => (e2.skills ? { ...e2, skills: '' } : e2));
                }
              }}
              className={fieldErrors.skills ? 'border-destructive' : ''}
            />
            {fieldErrors.skills && <p className="text-xs text-destructive font-medium">{fieldErrors.skills}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.skills.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted border border-border text-[10px] font-bold">
                  {s}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((_, j) => j !== i) }))} className="hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

type EducationForm = {
  school: string;
  schoolDomain: string;
  schoolLogo: string;
  degree: string;
  fieldOfStudy: string;
  currentEducation: boolean;
  startDate: string;
  endDate: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  grade: string;
  description: string;
  activity: string;
};

const EDUCATION_DEFAULT: EducationForm = {
  school: '',
  schoolDomain: '',
  schoolLogo: '',
  degree: '',
  fieldOfStudy: '',
  currentEducation: false,
  startDate: '',
  endDate: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  grade: '',
  description: '',
  activity: '',
};

function EducationContent() {
  const { user, updateProfile, token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const list = (user?.education ?? []).map((e) => {
    const start = valueToMonthYear(e.startDate ?? '');
    const end = valueToMonthYear(e.endDate ?? '');
    return {
      school: e.school ?? '',
      schoolDomain: e.schoolDomain ?? '',
      schoolLogo: (e as { schoolLogo?: string }).schoolLogo ?? '',
      degree: e.degree ?? '',
      fieldOfStudy: e.fieldOfStudy ?? (e as { field?: string }).field ?? '',
      currentEducation: !!e.currentEducation,
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      startMonth: start.month,
      startYear: start.year,
      endMonth: end.month,
      endYear: end.year,
      grade: e.grade ?? '',
      description: e.description ?? '',
      activity: (e as { activity?: string }).activity ?? '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const [form, setForm] = useState<EducationForm>(EDUCATION_DEFAULT);
  const [initialForm, setInitialForm] = useState<EducationForm>(EDUCATION_DEFAULT);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [schoolLogoUploading, setSchoolLogoUploading] = useState(false);
  const schoolLogoInputRef = useRef<HTMLInputElement>(null);
  const hasFormChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  const openAdd = () => { setForm(EDUCATION_DEFAULT); setInitialForm(EDUCATION_DEFAULT); setEditingIndex(null); setFieldErrors({}); setDialogOpen(true); };
  const openEdit = (i: number) => { const next = { ...EDUCATION_DEFAULT, ...list[i] }; setForm(next); setInitialForm(next); setEditingIndex(i); setFieldErrors({}); setDialogOpen(true); };
  const openedEditFromUrlRefEd = useRef(false);
  useEffect(() => {
    if (openedEditFromUrlRefEd.current || list.length === 0) return;
    const edit = searchParams.get('edit');
    if (edit == null) return;
    const idx = parseInt(edit, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    openedEditFromUrlRefEd.current = true;
    openEdit(idx);
    router.replace('/settings?section=education', { scroll: false });
  }, [list.length]);
  const remove = async (i: number) => {
    const next = list.filter((_, idx) => idx !== i).map((e) => ({
      school: e.school,
      schoolDomain: e.schoolDomain,
      schoolLogo: e.schoolLogo,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      currentEducation: e.currentEducation,
      startDate: e.startDate,
      endDate: e.endDate,
      grade: e.grade,
      description: e.description,
      activity: e.activity,
    }));
    setSaving(true);
    try {
      await updateProfile({ education: next });
      toast.success('Removed.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };
  const submitDialog = async () => {
    const err: Record<string, string> = {};
    if (!form.school.trim()) err.school = 'School name is required.';
    if (!form.degree.trim()) err.degree = 'Degree is required.';
    const startDateVal = monthYearToValue(form.startMonth, form.startYear);
    if (!startDateVal) err.startDate = 'Start date is required.';
    if (!form.currentEducation) {
      const endDateVal = monthYearToValue(form.endMonth, form.endYear);
      if (!endDateVal) err.endDate = 'End date is required when not currently enrolled.';
      else if (startDateVal && endDateVal < startDateVal) err.endDate = 'End date cannot be earlier than start date.';
    }
    if (Object.keys(err).length) { setFieldErrors(err); toast.error('Please fix the errors below.'); return; }
    setFieldErrors({});
    const endDateVal = form.currentEducation ? undefined : (monthYearToValue(form.endMonth, form.endYear) || undefined);
    const entry = {
      school: form.school.trim(),
      schoolDomain: form.schoolDomain.trim().slice(0, 120) || undefined,
      schoolLogo: form.schoolLogo.trim() || undefined,
      degree: form.degree.trim().slice(0, 80),
      fieldOfStudy: form.fieldOfStudy.trim().slice(0, 120) || undefined,
      currentEducation: form.currentEducation,
      startDate: startDateVal,
      endDate: endDateVal,
      grade: form.grade.trim().slice(0, 80) || undefined,
      activity: form.activity.trim().slice(0, 500) || undefined,
      description: form.description?.trim().slice(0, 2000) || undefined,
    };
    const next = editingIndex !== null ? list.map((e, i) => (i === editingIndex ? entry : e)) : [...list, entry];
    setSaving(true);
    try {
      await updateProfile({ education: next });
      toast.success(editingIndex !== null ? 'Updated.' : 'Added.');
      setDialogOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleSchoolLogoUpload = (file: File) => {
    if (!token) return;
    void postSettingsLogoUpload(
      file,
      token,
      'school-logo',
      (url) => setForm((f) => ({ ...f, schoolLogo: url })),
      setSchoolLogoUploading
    );
  };

  return (
    <div className="space-y-8">
      <SettingsSectionHeader variant="education" onPrimaryAction={openAdd} disabled={saving} />
      <FormSection>
        {list.length === 0 ? (
          <SettingsSectionEmptyState
            icon={GraduationCap}
            title="No education added yet"
            tagline="Add your degrees and schools. Help others see your learning journey."
            addLabel="Add education"
            onAdd={openAdd}
          />
        ) : (
          <>
            {list.map((e, i) => {
              return (
                <EducationCard
                  key={i}
                  education={e}
                  index={i}
                  saving={saving}
                  onEdit={() => openEdit(i)}
                  onRemove={() => setRemoveConfirmIndex(i)}
                  formatMonthYear={formatMonthYear}
                />
              );
            })}
          </>
        )}
      </FormSection>
      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="Remove education"
        message="This entry will be removed from your profile. You can add it again later."
        confirmLabel="Remove"
        variant="danger"
        loading={saving}
        onConfirm={() => { if (removeConfirmIndex !== null) { remove(removeConfirmIndex); setRemoveConfirmIndex(null); } }}
      />
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center justify-center size-8 border-2 border-primary/30 bg-primary/10 text-primary">
              <GraduationCap className="size-4" />
            </span>
            Education
          </span>
        }
        titleId="edu-dialog"
        subtitle="School, degree, and dates. Add activity or grade if needed."
        panelClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">* Required fields</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDialogOpen(false)} className={settingsBtnSecondary}>Cancel</button>
              <button type="button" onClick={submitDialog} disabled={saving || !hasFormChanged} className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-5 py-2.5 text-xs tracking-wide')}>{saving ? 'Saving…' : hasFormChanged ? 'Confirm changes' : 'Save'}</button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <EntitySearchInput
            id="edu-school"
            label="School name *"
            placeholder="Type school name (e.g. MIT)"
            value={form.school}
            onChange={(v) => { setForm((f) => ({ ...f, school: v })); if (fieldErrors.school) setFieldErrors((e2) => (e2.school ? { ...e2, school: '' } : e2)); }}
            onDomainSelect={(d) => setForm((f) => ({ ...f, schoolDomain: d }))}
            searchOptions={searchSchools}
            error={fieldErrors.school}
            maxLength={200}
          />
          <FormInput id="edu-domain" label="School domain (optional)" placeholder="Ex: university.edu" maxLength={120} value={form.schoolDomain} onChange={(e) => setForm((f) => ({ ...f, schoolDomain: e.target.value.slice(0, 120) }))} />
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">School logo (optional)</Label>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center border-2 border-border bg-muted/30 overflow-hidden">
                {form.schoolLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.schoolLogo}
                    alt="Logo"
                    className="size-full object-contain"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <GraduationCap className="size-6 text-muted-foreground" />
                )}
              </span>
              <div className="flex gap-2">
                <input
                  ref={schoolLogoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    if (f) handleSchoolLogoUpload(f);
                    ev.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => schoolLogoInputRef.current?.click()}
                  disabled={schoolLogoUploading}
                  className="px-3 py-1.5 border-2 border-border text-[10px] font-bold uppercase hover:bg-muted/30 disabled:opacity-50"
                >
                  {schoolLogoUploading ? 'Uploading…' : 'Upload logo'}
                </button>
                {form.schoolLogo && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, schoolLogo: '' }))}
                    className="px-3 py-1.5 border-2 border-destructive text-destructive text-[10px] font-bold uppercase hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">
              JPEG, PNG, WebP, or SVG. Max 2 MB. Resized to 128×128.
            </p>
          </div>
          <FormInput id="edu-degree" label="Degree *" placeholder="Ex: Bachelor, Master, PhD, Diploma" maxLength={80} value={form.degree} error={fieldErrors.degree} onChange={(e) => { setForm((f) => ({ ...f, degree: e.target.value })); if (fieldErrors.degree) setFieldErrors((e2) => (e2.degree ? { ...e2, degree: '' } : e2)); }} />
          <FormInput id="edu-field" label="Field of study (optional)" placeholder="Ex: Science in Computer Science" maxLength={120} value={form.fieldOfStudy} onChange={(e) => setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} />
          <FormCheckbox id="edu-current" label="I'm currently pursuing this" checked={form.currentEducation} onCheckedChange={(v) => setForm((f) => ({ ...f, currentEducation: v, ...(v ? { endMonth: '', endYear: '' } : {}) }))} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Start date *</Label>
              <div className="flex gap-2">
                <SearchableSelect id="edu-start-month" label="" placeholder="Month" value={form.startMonth} onChange={(v) => { setForm((f) => ({ ...f, startMonth: v })); if (fieldErrors.startDate) setFieldErrors((e2) => (e2.startDate ? { ...e2, startDate: '' } : e2)); }} options={MONTH_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                <SearchableSelect
                  id="edu-start-year"
                  label=""
                  placeholder="Year"
                  value={form.startYear}
                  onChange={(v) => {
                    setForm((f) => {
                      const sy = parseInt(v || '', 10);
                      const ey = parseInt(f.endYear || '', 10);
                      const nextEndYear = Number.isFinite(sy) && Number.isFinite(ey) && ey < sy ? v : f.endYear;
                      return { ...f, startYear: v, endYear: nextEndYear };
                    });
                    if (fieldErrors.startDate) setFieldErrors((e2) => (e2.startDate ? { ...e2, startDate: '' } : e2));
                  }}
                  options={YEAR_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
              </div>
              {fieldErrors.startDate && <p className="text-xs text-destructive font-medium">{fieldErrors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">End date{!form.currentEducation ? ' *' : ''}</Label>
              <div className="flex gap-2">
                <SearchableSelect id="edu-end-month" label="" placeholder="Month" value={form.endMonth} onChange={(v) => { setForm((f) => ({ ...f, endMonth: v })); if (fieldErrors.endDate) setFieldErrors((e2) => (e2.endDate ? { ...e2, endDate: '' } : e2)); }} options={MONTH_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" disabled={form.currentEducation} />
                <SearchableSelect
                  id="edu-end-year"
                  label=""
                  placeholder="Year"
                  value={form.endYear}
                  onChange={(v) => { setForm((f) => ({ ...f, endYear: v })); if (fieldErrors.endDate) setFieldErrors((e2) => (e2.endDate ? { ...e2, endDate: '' } : e2)); }}
                  options={yearOptionsFrom(form.startYear)}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                  disabled={form.currentEducation}
                />
              </div>
              {fieldErrors.endDate && <p className="text-xs text-destructive font-medium">{fieldErrors.endDate}</p>}
              {form.currentEducation && !fieldErrors.endDate && <p className="text-[9px] text-muted-foreground">Disabled while currently pursuing</p>}
            </div>
          </div>
          <FormInput id="edu-grade" label="Grade (optional)" placeholder="Ex: 3.8/4.0, First Class Honours" maxLength={80} value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value.slice(0, 80) }))} />
          <FormTextarea id="edu-activity" label="Activity (optional)" placeholder="Clubs, hackathons, projects" maxLength={500} rows={2} value={form.activity} onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value.slice(0, 500) }))} />
        </div>
      </FormDialog>
    </div>
  );
}

type CertForm = {
  name: string;
  issuingOrganization: string;
  issuerLogo: string;
  issueDate: string;
  expirationDate: string;
  issueMonth: string;
  issueYear: string;
  expMonth: string;
  expYear: string;
  credentialId: string;
  credentialUrl: string;
  description: string;
  skills: string[];
  mediaItems: MediaItem[];
};

const CERT_DEFAULT: CertForm = { name: '', issuingOrganization: '', issuerLogo: '', issueDate: '', expirationDate: '', issueMonth: '', issueYear: '', expMonth: '', expYear: '', credentialId: '', credentialUrl: '', description: '', skills: [], mediaItems: [] };

function CertificationsContent() {
  const { user, updateProfile, token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const list = (user?.certifications ?? []).map((c) => {
    const issue = valueToMonthYear(c.issueDate ?? '');
    const exp = valueToMonthYear(c.expirationDate ?? '');
    return {
      name: c.name ?? '',
      issuingOrganization: c.issuingOrganization ?? '',
      issuerLogo: (c as { issuerLogo?: string }).issuerLogo ?? '',
      issueDate: c.issueDate ?? '',
      expirationDate: c.expirationDate ?? '',
      issueMonth: issue.month,
      issueYear: issue.year,
      expMonth: exp.month,
      expYear: exp.year,
      credentialId: c.credentialId ?? '',
      credentialUrl: c.credentialUrl ?? '',
      description: c.description ?? '',
      skills: (c as { skills?: string[] }).skills ?? [],
      mediaItems: ((c as { media?: MediaItem[] }).media ?? []).map((m) => ({ url: m.url, title: m.title, altText: m.altText })),
    };
  });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<CertForm>(CERT_DEFAULT);
  const [initialForm, setInitialForm] = useState<CertForm>(CERT_DEFAULT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [certAddMediaDropdownOpen, setCertAddMediaDropdownOpen] = useState(false);
  const [certShowLinkForm, setCertShowLinkForm] = useState(false);
  const [certUploadMediaDialogOpen, setCertUploadMediaDialogOpen] = useState(false);
  const [certLinkUrl, setCertLinkUrl] = useState('');
  const [certLinkTitle, setCertLinkTitle] = useState('');
  const [certFullViewMedia, setCertFullViewMedia] = useState<MediaItem | null>(null);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const [certLogoUploading, setCertLogoUploading] = useState(false);
  const certLogoInputRef = useRef<HTMLInputElement>(null);
  const certMediaDropdownRef = useRef<HTMLDivElement>(null);
  const hasFormChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (certMediaDropdownRef.current && !certMediaDropdownRef.current.contains(e.target as Node)) setCertAddMediaDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAdd = () => { setForm(CERT_DEFAULT); setInitialForm(CERT_DEFAULT); setEditingIndex(null); setFieldErrors({}); setDialogOpen(true); };
  const openEdit = (i: number) => { const next = { ...CERT_DEFAULT, ...list[i] }; setForm(next); setInitialForm(next); setEditingIndex(i); setFieldErrors({}); setDialogOpen(true); };
  const openedEditFromUrlRefCert = useRef(false);
  useEffect(() => {
    if (openedEditFromUrlRefCert.current || list.length === 0) return;
    const edit = searchParams.get('edit');
    if (edit == null) return;
    const idx = parseInt(edit, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    openedEditFromUrlRefCert.current = true;
    openEdit(idx);
    router.replace('/settings?section=certifications', { scroll: false });
  }, [list.length]);
  const remove = async (i: number) => {
    const next = list.filter((_, idx) => idx !== i).map((c) => ({
      name: c.name,
      issuingOrganization: c.issuingOrganization,
      issuerLogo: c.issuerLogo,
      issueDate: c.issueDate,
      expirationDate: c.expirationDate,
      credentialId: c.credentialId,
      credentialUrl: c.credentialUrl,
      description: c.description,
      skills: c.skills,
      media: c.mediaItems.map((m) => ({ url: m.url, title: m.title, altText: m.altText })),
    }));
    setSaving(true);
    try {
      await updateProfile({ certifications: next });
      toast.success('Removed.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };
  const addCertSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !form.skills.includes(s) && form.skills.length < 30) setForm((f) => ({ ...f, skills: [...f.skills, s] }));
  };
  const handleCertLogoUpload = (file: File) => {
    if (!token) return;
    void postSettingsLogoUpload(
      file,
      token,
      'org-logo',
      (url) => setForm((f) => ({ ...f, issuerLogo: url })),
      setCertLogoUploading
    );
  };

  const submitDialog = async () => {
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = 'Certification name is required.';
    if (!form.issuingOrganization.trim()) err.issuingOrganization = 'Issuing organization is required.';
    const issueDateVal = monthYearToValue(form.issueMonth, form.issueYear);
    if (!issueDateVal) err.issueDate = 'Issue date is required.';
    const expDateVal = monthYearToValue(form.expMonth, form.expYear);
    if (expDateVal && issueDateVal && expDateVal < issueDateVal) err.expirationDate = 'Expiration date cannot be earlier than issue date.';
    if (form.skills.filter(Boolean).length < 1) err.skills = 'At least 1 skill is required.';
    if (Object.keys(err).length) { setFieldErrors(err); toast.error('Please fix the errors below.'); return; }
    setFieldErrors({});
    const entry = {
      name: form.name.trim().slice(0, 120),
      issuingOrganization: form.issuingOrganization.trim().slice(0, 120),
      issuerLogo: form.issuerLogo.trim() || undefined,
      issueDate: issueDateVal,
      expirationDate: expDateVal || undefined,
      credentialId: form.credentialId.trim().slice(0, 80) || undefined,
      credentialUrl: form.credentialUrl.trim().slice(0, 500) || undefined,
      description: form.description.trim().slice(0, 2000) || undefined,
      skills: form.skills.filter(Boolean).slice(0, 30),
      media: form.mediaItems.filter((m) => m.url.trim()).slice(0, 5).map((m) => ({ url: m.url.trim(), title: m.title?.trim() || undefined, altText: m.altText?.trim() || undefined })),
    };
    const next = editingIndex !== null ? list.map((e, i) => (i === editingIndex ? entry : e)) : [...list, entry];
    setSaving(true);
    try {
      await updateProfile({ certifications: next });
      toast.success(editingIndex !== null ? 'Updated.' : 'Added.');
      setDialogOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <SettingsSectionHeader variant="certifications" onPrimaryAction={openAdd} disabled={saving} />
      <FormSection>
        {list.length === 0 ? (
          <SettingsSectionEmptyState
            icon={Award}
            title="No licenses or certifications yet"
            tagline="Add credentials to stand out. Show what you've earned."
            addLabel="Add license or certification"
            onAdd={openAdd}
          />
        ) : (
          <>
            {list.map((e, i) => {
              return (
                <CertificationCard
                  key={i}
                  cert={e}
                  index={i}
                  saving={saving}
                  onEdit={() => openEdit(i)}
                  onRemove={() => setRemoveConfirmIndex(i)}
                  onPreviewMedia={(item) => setCertFullViewMedia(item)}
                  formatMonthYear={formatMonthYear}
                  domainFromUrl={domainFromUrl}
                  isImageUrl={isImageUrl}
                />
              );
            })}
          </>
        )}
      </FormSection>
      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="Remove certification"
        message="This entry will be removed from your profile. You can add it again later."
        confirmLabel="Remove"
        variant="danger"
        loading={saving}
        onConfirm={() => { if (removeConfirmIndex !== null) { remove(removeConfirmIndex); setRemoveConfirmIndex(null); } }}
      />
      <MediaFullViewDialog
        open={!!certFullViewMedia}
        onClose={() => setCertFullViewMedia(null)}
        src={certFullViewMedia?.url ?? ''}
        title={certFullViewMedia?.title}
        altText={certFullViewMedia?.altText}
      />
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center justify-center size-8 border-2 border-primary/30 bg-primary/10 text-primary">
              <Award className="size-4" />
            </span>
            License or certification
          </span>
        }
        titleId="cert-dialog"
        subtitle="Name, issuing organization, issue date, and at least 1 skill. Add issuer logo, credential URL, or media if needed."
        panelClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">* Required fields</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDialogOpen(false)} className={settingsBtnSecondary}>Cancel</button>
              <button type="button" onClick={submitDialog} disabled={saving || !hasFormChanged} className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-5 py-2.5 text-xs tracking-wide')}>{saving ? 'Saving…' : hasFormChanged ? 'Confirm changes' : 'Save'}</button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput id="cert-name" label="Certification name *" placeholder="Ex: AWS Certified Solutions Architect" maxLength={120} value={form.name} error={fieldErrors.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); if (fieldErrors.name) setFieldErrors((e2) => (e2.name ? { ...e2, name: '' } : e2)); }} />
          <EntitySearchInput
            id="cert-org"
            label="Issuing organization *"
            placeholder="Type organization (e.g. AWS, Coursera)"
            value={form.issuingOrganization}
            onChange={(v) => { setForm((f) => ({ ...f, issuingOrganization: v })); if (fieldErrors.issuingOrganization) setFieldErrors((e2) => (e2.issuingOrganization ? { ...e2, issuingOrganization: '' } : e2)); }}
            searchOptions={searchOrganizations}
            error={fieldErrors.issuingOrganization}
            maxLength={120}
          />
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Issuer logo (optional)</Label>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center border-2 border-border bg-muted/30 overflow-hidden">
                {form.issuerLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.issuerLogo} alt="Logo" className="size-full object-contain" onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Award className="size-6 text-muted-foreground" />
                )}
              </span>
              <div className="flex gap-2">
                <input ref={certLogoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) handleCertLogoUpload(f); ev.target.value = ''; }} />
                <button type="button" onClick={() => certLogoInputRef.current?.click()} disabled={certLogoUploading} className="px-3 py-1.5 border-2 border-border text-[10px] font-bold uppercase hover:bg-muted/30 disabled:opacity-50">{certLogoUploading ? 'Uploading…' : 'Upload logo'}</button>
                {form.issuerLogo && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, issuerLogo: '' }))} className="px-3 py-1.5 border-2 border-destructive text-destructive text-[10px] font-bold uppercase hover:bg-destructive/10">Remove</button>
                )}
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">JPEG, PNG, WebP, or SVG. Max 2 MB. Resized to 128×128.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Issue date *</Label>
              <div className="flex gap-2">
                <SearchableSelect id="cert-issue-month" label="" placeholder="Month" value={form.issueMonth} onChange={(v) => { setForm((f) => ({ ...f, issueMonth: v })); if (fieldErrors.issueDate) setFieldErrors((e2) => (e2.issueDate ? { ...e2, issueDate: '' } : e2)); }} options={MONTH_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                <SearchableSelect
                  id="cert-issue-year"
                  label=""
                  placeholder="Year"
                  value={form.issueYear}
                  onChange={(v) => {
                    setForm((f) => {
                      const iy = parseInt(v || '', 10);
                      const ey = parseInt(f.expYear || '', 10);
                      const nextExpYear = Number.isFinite(iy) && Number.isFinite(ey) && ey < iy ? v : f.expYear;
                      return { ...f, issueYear: v, expYear: nextExpYear };
                    });
                    if (fieldErrors.issueDate) setFieldErrors((e2) => (e2.issueDate ? { ...e2, issueDate: '' } : e2));
                  }}
                  options={YEAR_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
              </div>
              {fieldErrors.issueDate && <p className="text-xs text-destructive font-medium">{fieldErrors.issueDate}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Expiration date (optional)</Label>
              <div className="flex gap-2">
                <SearchableSelect id="cert-exp-month" label="" placeholder="Month" value={form.expMonth} onChange={(v) => setForm((f) => ({ ...f, expMonth: v }))} options={MONTH_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                <SearchableSelect id="cert-exp-year" label="" placeholder="Year" value={form.expYear} onChange={(v) => setForm((f) => ({ ...f, expYear: v }))} options={yearOptionsFrom(form.issueYear)} listMaxHeight={220} widthClass="flex-1 min-w-0" />
              </div>
              {fieldErrors.expirationDate && <p className="text-xs text-destructive font-medium">{fieldErrors.expirationDate}</p>}
            </div>
          </div>
          <FormInput id="cert-cred-id" label="Credential ID (optional)" placeholder="Ex: Certificate number" maxLength={80} value={form.credentialId} onChange={(e) => setForm((f) => ({ ...f, credentialId: e.target.value }))} />
          <FormInput id="cert-cred-url" label="Credential URL (optional)" type="url" placeholder="Link to verification page" maxLength={500} value={form.credentialUrl} onChange={(e) => setForm((f) => ({ ...f, credentialUrl: e.target.value }))} />
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="cert-skills">Skills * (min 1)</Label>
            <Input
              id="cert-skills"
              placeholder="Add skills. Comma (,) or Enter. Min 1, max 30."
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  const raw = input.value;
                  raw
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach(addCertSkill);
                  input.value = '';
                  if (fieldErrors.skills) setFieldErrors((e2) => (e2.skills ? { ...e2, skills: '' } : e2));
                }
              }}
              onBlur={(e) => {
                const v = (e.target as HTMLInputElement).value;
                if (v.includes(',')) {
                  v.split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach(addCertSkill);
                  (e.target as HTMLInputElement).value = '';
                  if (fieldErrors.skills) setFieldErrors((e2) => (e2.skills ? { ...e2, skills: '' } : e2));
                }
              }}
              className={fieldErrors.skills ? 'border-destructive' : ''}
            />
            {fieldErrors.skills && <p className="text-xs text-destructive font-medium">{fieldErrors.skills}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.skills.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted border border-border text-[10px] font-bold">
                  {s}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((_, j) => j !== i) }))} className="hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Media (optional)</Label>
            {form.mediaItems.length > 0 && (
              <ul className="space-y-2">
                {form.mediaItems.map((m, i) => (
                  <MediaThumbnailRow
                    key={i}
                    item={m}
                    onPreview={() => setCertFullViewMedia(m)}
                    onRemove={() => setForm((f) => ({ ...f, mediaItems: f.mediaItems.filter((_, j) => j !== i) }))}
                  />
                ))}
              </ul>
            )}
            {form.mediaItems.length < 5 && (
              <div className="relative" ref={certMediaDropdownRef}>
                {certAddMediaDropdownOpen && <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setCertAddMediaDropdownOpen(false)} />}
                <button type="button" onClick={() => setCertAddMediaDropdownOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border text-[10px] font-bold uppercase hover:bg-muted/30">
                  <Plus className="size-3" /> Add media <ChevronDown className={cn('size-3', certAddMediaDropdownOpen && 'rotate-180')} />
                </button>
                {certAddMediaDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 z-[100] min-w-[200px] border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] py-1">
                    <button type="button" onClick={() => { setCertAddMediaDropdownOpen(false); setCertShowLinkForm(true); setCertLinkUrl(''); setCertLinkTitle(''); }} className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"><Link2 className="size-4" /> Add link</button>
                    <button type="button" onClick={() => { setCertAddMediaDropdownOpen(false); setCertUploadMediaDialogOpen(true); }} className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"><ImagePlus className="size-4" /> Upload media</button>
                  </div>
                )}
                {certShowLinkForm && (
                  <div className="mt-2 p-3 border-2 border-border bg-muted/10 space-y-2 relative">
                    <button type="button" onClick={() => { setCertShowLinkForm(false); setCertLinkUrl(''); setCertLinkTitle(''); }} className="absolute right-2 top-2 p-1 border-2 border-border" aria-label="Close"><X className="size-4" /></button>
                    <Label className="text-[10px] font-bold uppercase">Link URL</Label>
                    <Input type="url" placeholder="https://..." value={certLinkUrl} onChange={(e) => setCertLinkUrl(e.target.value)} className="text-sm" />
                    <Label className="text-[10px] font-bold uppercase">Title (optional)</Label>
                    <Input placeholder="e.g. Certificate" value={certLinkTitle} onChange={(e) => setCertLinkTitle(e.target.value)} className="text-sm" maxLength={120} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setCertShowLinkForm(false); setCertLinkUrl(''); setCertLinkTitle(''); }} className={settingsBtnSecondaryCompact}>Cancel</button>
                      <button type="button" onClick={() => { const u = certLinkUrl.trim(); if (u && (u.startsWith('http://') || u.startsWith('https://'))) { setForm((f) => ({ ...f, mediaItems: [...f.mediaItems, { url: u, title: certLinkTitle.trim() || undefined }].slice(0, 5) })); setCertLinkUrl(''); setCertLinkTitle(''); setCertShowLinkForm(false); } else toast.error('Enter a valid URL.'); }} className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-3 py-1.5 text-[10px] font-bold')}>Add link</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {token && <UploadMediaDialog open={certUploadMediaDialogOpen} onClose={() => setCertUploadMediaDialogOpen(false)} token={token} onSuccess={(item) => { setForm((f) => ({ ...f, mediaItems: [...f.mediaItems, item].slice(0, 5) })); setCertUploadMediaDialogOpen(false); }} />}
          <FormTextarea id="cert-desc" label="Description (optional)" placeholder="Topics, skills validated" maxLength={2000} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))} />
        </div>
      </FormDialog>
    </div>
  );
}

type ProjectType = 'project' | 'publication';
type ProjectForm = {
  type: ProjectType;
  title: string;
  publisher: string;
  ongoing: boolean;
  publicationDate: string;
  endDate: string;
  publicationMonth: string;
  publicationYear: string;
  endMonth: string;
  endYear: string;
  publicationUrl: string;
  description: string;
  mediaItems: MediaItem[];
};
const PROJECT_DEFAULT: ProjectForm = {
  type: 'project',
  title: '', publisher: '', ongoing: false, publicationDate: '', endDate: '',
  publicationMonth: '', publicationYear: '', endMonth: '', endYear: '',
  publicationUrl: '', description: '', mediaItems: [],
};

function ProjectsContent() {
  const { user, updateProfile, token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fullProjects = user?.projects ?? [];
  const isGithubProject = (p: unknown) => (p as { source?: string }).source === 'github';
  const githubProjects = fullProjects.filter(isGithubProject);
  const nonGithubProjects = fullProjects.filter((p) => !isGithubProject(p));
  const list = nonGithubProjects.map((p) => {
    const pub = valueToMonthYear(p.publicationDate ?? '');
    const end = valueToMonthYear(p.endDate ?? '');
    const rawType = (p as { type?: string }).type;
    const type: ProjectType = rawType === 'publication' ? 'publication' : 'project';
    return {
      type,
      title: p.title ?? (p as { name?: string }).name ?? '',
      publisher: p.publisher ?? '',
      ongoing: !!p.ongoing,
      publicationDate: p.publicationDate ?? '',
      endDate: p.endDate ?? '',
      publicationMonth: pub.month,
      publicationYear: pub.year,
      endMonth: end.month,
      endYear: end.year,
      publicationUrl: p.publicationUrl ?? (p as { url?: string }).url ?? '',
      description: p.description ?? '',
      mediaItems: ((p as { media?: MediaItem[] }).media ?? []).map((m) => ({ url: m.url, title: m.title, altText: m.altText })),
    };
  });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectForm>(PROJECT_DEFAULT);
  const [initialForm, setInitialForm] = useState<ProjectForm>(PROJECT_DEFAULT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [projAddMediaDropdownOpen, setProjAddMediaDropdownOpen] = useState(false);
  const [projShowLinkForm, setProjShowLinkForm] = useState(false);
  const [projUploadMediaDialogOpen, setProjUploadMediaDialogOpen] = useState(false);
  const [projLinkUrl, setProjLinkUrl] = useState('');
  const [projLinkTitle, setProjLinkTitle] = useState('');
  const [projFullViewMedia, setProjFullViewMedia] = useState<MediaItem | null>(null);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const projMediaDropdownRef = useRef<HTMLDivElement>(null);
  const hasFormChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projMediaDropdownRef.current && !projMediaDropdownRef.current.contains(e.target as Node)) setProjAddMediaDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAdd = () => { setForm(PROJECT_DEFAULT); setInitialForm(PROJECT_DEFAULT); setEditingIndex(null); setFieldErrors({}); setDialogOpen(true); };
  const openEdit = (i: number) => { const item = list[i]; const next: ProjectForm = { ...PROJECT_DEFAULT, ...item, type: item.type }; setForm(next); setInitialForm(next); setEditingIndex(i); setFieldErrors({}); setDialogOpen(true); };
  const openedEditFromUrlRefProj = useRef(false);
  useEffect(() => {
    if (openedEditFromUrlRefProj.current || list.length === 0) return;
    const edit = searchParams.get('edit');
    if (edit == null) return;
    const idx = parseInt(edit, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    openedEditFromUrlRefProj.current = true;
    openEdit(idx);
    router.replace('/settings?section=projects', { scroll: false });
  }, [list.length]);
  const remove = async (i: number) => {
    const next = [...githubProjects, ...nonGithubProjects.filter((_, idx) => idx !== i)];
    setSaving(true);
    try {
      await updateProfile({ projects: next });
      toast.success('Removed.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };
  const submitDialog = async () => {
    const err: Record<string, string> = {};
    if (!form.title.trim()) err.title = 'Title is required.';
    const pubDateVal = monthYearToValue(form.publicationMonth, form.publicationYear);
    if (!pubDateVal) err.publicationDate = 'Publication date is required.';
    if (Object.keys(err).length) { setFieldErrors(err); toast.error('Please fix the errors below.'); return; }
    setFieldErrors({});
    const endDateVal = form.ongoing ? undefined : (monthYearToValue(form.endMonth, form.endYear) || undefined);
    const entry = {
      type: form.type,
      title: form.title.trim().slice(0, 120),
      publisher: form.publisher.trim().slice(0, 120) || undefined,
      ongoing: form.ongoing,
      publicationDate: pubDateVal,
      endDate: endDateVal,
      publicationUrl: form.publicationUrl.trim().slice(0, 500) || undefined,
      description: form.description.trim().slice(0, 2000) || undefined,
      media: form.mediaItems.filter((m) => m.url.trim()).slice(0, 5).map((m) => ({ url: m.url.trim(), title: m.title?.trim() || undefined, altText: m.altText?.trim() || undefined })),
    };
    const next = editingIndex !== null
      ? [...githubProjects, ...nonGithubProjects.map((p, j) => (j === editingIndex ? entry : p))]
      : [...fullProjects, entry];
    setSaving(true);
    try {
      await updateProfile({ projects: next });
      toast.success(editingIndex !== null ? 'Updated.' : 'Added.');
      setDialogOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <SettingsSectionHeader variant="projects" onPrimaryAction={openAdd} disabled={saving} />
      <FormSection>
        {list.length === 0 ? (
          <SettingsSectionEmptyState
            icon={FolderGit2}
            title="No projects or publications yet"
            tagline="Share what you've built or published. Add your first project to get started."
            addLabel="Add project"
            onAdd={openAdd}
          />
        ) : (
          <>
            {list.map((e, i) => (
              <ProjectCard
                key={i}
                project={e}
                index={i}
                saving={saving}
                onEdit={() => openEdit(i)}
                onRemove={() => setRemoveConfirmIndex(i)}
                onPreviewMedia={(item) => setProjFullViewMedia(item)}
                formatMonthYear={formatMonthYear}
                domainFromUrl={domainFromUrl}
                isImageUrl={isImageUrl}
              />
            ))}
          </>
        )}
      </FormSection>
      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="Remove project"
        message="This entry will be removed from your profile. You can add it again later."
        confirmLabel="Remove"
        variant="danger"
        loading={saving}
        onConfirm={() => { if (removeConfirmIndex !== null) { remove(removeConfirmIndex); setRemoveConfirmIndex(null); } }}
      />
      <MediaFullViewDialog
        open={!!projFullViewMedia}
        onClose={() => setProjFullViewMedia(null)}
        src={projFullViewMedia?.url ?? ''}
        title={projFullViewMedia?.title}
        altText={projFullViewMedia?.altText}
      />
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center justify-center size-8 border-2 border-primary/30 bg-primary/10 text-primary">
              <FileText className="size-4" />
            </span>
            Projects & publications
          </span>
        }
        titleId="proj-dialog"
        subtitle="Title, publisher, and publication date. Add media or URL if needed."
        headerRight={
          <div className="flex border-2 border-border bg-muted/20 p-0.5 gap-0.5 shadow-[2px_2px_0px_0px_var(--border)]">
            <Toggle
              pressed={form.type === 'project'}
              onPressedChange={(p) => p && setForm((f) => ({ ...f, type: 'project' }))}
              className="min-w-0 px-3 py-1.5 rounded-none border-0"
            >
              <FolderGit2 className="size-3.5 shrink-0" /> Project
            </Toggle>
            <Toggle
              pressed={form.type === 'publication'}
              onPressedChange={(p) => p && setForm((f) => ({ ...f, type: 'publication' }))}
              className="min-w-0 px-3 py-1.5 rounded-none border-0"
            >
              <BookOpen className="size-3.5 shrink-0" /> Publication
            </Toggle>
          </div>
        }
        panelClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">* Required fields</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDialogOpen(false)} className={settingsBtnSecondary}>Cancel</button>
              <button type="button" onClick={submitDialog} disabled={saving || !hasFormChanged} className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-5 py-2.5 text-xs tracking-wide')}>{saving ? 'Saving…' : hasFormChanged ? 'Confirm changes' : 'Save'}</button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput id="proj-title" label="Title *" placeholder="Ex: Building Scalable APIs with Go" maxLength={120} value={form.title} error={fieldErrors.title} onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); if (fieldErrors.title) setFieldErrors((e2) => (e2.title ? { ...e2, title: '' } : e2)); }} />
          <FormInput id="proj-pub" label="Publisher *" placeholder="Publisher name" maxLength={120} value={form.publisher} onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))} />
          <FormCheckbox
            id="proj-ongoing"
            label="Ongoing project/publication"
            checked={form.ongoing}
            onCheckedChange={(v) => setForm((f) => ({ ...f, ongoing: v, ...(v ? { endMonth: '', endYear: '' } : {}) }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Publication date *</Label>
              <div className="flex gap-2">
                <SearchableSelect id="proj-pub-month" label="" placeholder="Month" value={form.publicationMonth} onChange={(v) => { setForm((f) => ({ ...f, publicationMonth: v })); if (fieldErrors.publicationDate) setFieldErrors((e2) => (e2.publicationDate ? { ...e2, publicationDate: '' } : e2)); }} options={MONTH_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                <SearchableSelect id="proj-pub-year" label="" placeholder="Year" value={form.publicationYear} onChange={(v) => setForm((f) => ({ ...f, publicationYear: v }))} options={YEAR_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
              </div>
              {fieldErrors.publicationDate && <p className="text-xs text-destructive font-medium">{fieldErrors.publicationDate}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">End date</Label>
              <div className="flex gap-2">
                <SearchableSelect id="proj-end-month" label="" placeholder="Month" value={form.endMonth} onChange={(v) => setForm((f) => ({ ...f, endMonth: v }))} options={MONTH_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" disabled={form.ongoing} />
                <SearchableSelect id="proj-end-year" label="" placeholder="Year" value={form.endYear} onChange={(v) => setForm((f) => ({ ...f, endYear: v }))} options={yearOptionsFrom(form.publicationYear)} listMaxHeight={220} widthClass="flex-1 min-w-0" disabled={form.ongoing} />
              </div>
              {form.ongoing && <p className="text-[9px] text-muted-foreground">Disabled for ongoing projects.</p>}
            </div>
          </div>
          <FormInput id="proj-url" label="Publication URL / Media link" type="url" placeholder="https://example.com/page" maxLength={500} value={form.publicationUrl} onChange={(e) => setForm((f) => ({ ...f, publicationUrl: e.target.value }))} />
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Media (max 5 images)</Label>
            {form.mediaItems.length > 0 && (
              <ul className="space-y-2">
                {form.mediaItems.map((m, i) => (
                  <MediaThumbnailRow
                    key={i}
                    item={m}
                    onPreview={() => setProjFullViewMedia(m)}
                    onRemove={() => setForm((f) => ({ ...f, mediaItems: f.mediaItems.filter((_, j) => j !== i) }))}
                  />
                ))}
              </ul>
            )}
            {form.mediaItems.length < 5 && (
              <div className="relative" ref={projMediaDropdownRef}>
                {projAddMediaDropdownOpen && <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setProjAddMediaDropdownOpen(false)} />}
                <button type="button" onClick={() => setProjAddMediaDropdownOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border text-[10px] font-bold uppercase hover:bg-muted/30">
                  <Plus className="size-3" /> Add media <ChevronDown className={cn('size-3', projAddMediaDropdownOpen && 'rotate-180')} />
                </button>
                {projAddMediaDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 z-[100] min-w-[200px] border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] py-1">
                    <button type="button" onClick={() => { setProjAddMediaDropdownOpen(false); setProjShowLinkForm(true); setProjLinkUrl(''); setProjLinkTitle(''); }} className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"><Link2 className="size-4" /> Add link</button>
                    <button type="button" onClick={() => { setProjAddMediaDropdownOpen(false); setProjUploadMediaDialogOpen(true); }} className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"><ImagePlus className="size-4" /> Upload media</button>
                  </div>
                )}
                {projShowLinkForm && (
                  <div className="mt-2 p-3 border-2 border-border bg-muted/10 space-y-2 relative">
                    <button type="button" onClick={() => { setProjShowLinkForm(false); setProjLinkUrl(''); setProjLinkTitle(''); }} className="absolute right-2 top-2 p-1 border-2 border-border" aria-label="Close"><X className="size-4" /></button>
                    <Label className="text-[10px] font-bold uppercase">Link URL</Label>
                    <Input type="url" placeholder="https://..." value={projLinkUrl} onChange={(e) => setProjLinkUrl(e.target.value)} className="text-sm" />
                    <Label className="text-[10px] font-bold uppercase">Title (optional)</Label>
                    <Input placeholder="e.g. Screenshot" value={projLinkTitle} onChange={(e) => setProjLinkTitle(e.target.value)} className="text-sm" maxLength={120} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setProjShowLinkForm(false); setProjLinkUrl(''); setProjLinkTitle(''); }} className={settingsBtnSecondaryCompact}>Cancel</button>
                      <button type="button" onClick={() => { const u = projLinkUrl.trim(); if (u && (u.startsWith('http://') || u.startsWith('https://'))) { setForm((f) => ({ ...f, mediaItems: [...f.mediaItems, { url: u, title: projLinkTitle.trim() || undefined }].slice(0, 5) })); setProjLinkUrl(''); setProjLinkTitle(''); setProjShowLinkForm(false); } else toast.error('Enter a valid URL.'); }} className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-3 py-1.5 text-[10px] font-bold')}>Add link</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {token && <UploadMediaDialog open={projUploadMediaDialogOpen} onClose={() => setProjUploadMediaDialogOpen(false)} token={token} onSuccess={(item) => { setForm((f) => ({ ...f, mediaItems: [...f.mediaItems, item].slice(0, 5) })); setProjUploadMediaDialogOpen(false); }} />}
          <FormTextarea id="proj-desc" label="Description — Summary of the work" placeholder="Summary of the work" maxLength={2000} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))} />
        </div>
      </FormDialog>
    </div>
  );
}

function OpenSourceContent() {
  const { user, updateProfile, token } = useAuthStore();
  const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '') : '';
  const MAX_OPEN_SOURCE_REPOS = 7;

  type GitHubRepo = {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    created_at: string;
    owner: { login: string };
    archived?: boolean;
  };

  const imported = (user?.projects ?? []).filter((p) => (p as { source?: string }).source === 'github');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [query, setQuery] = useState('');

  const fetchRepos = async () => {
    if (!token) return;
    if (!user?.isGitAccount) {
      toast.error('Link GitHub first in Security → Connected accounts.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/github/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string; repos?: GitHubRepo[] } | null;
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to fetch repos.');
      setRepos((data.repos ?? []).filter((r) => !r.archived));
    } catch (e) {
      setRepos([]);
      setError(e instanceof Error ? e.message : 'Failed to fetch repos.');
    } finally {
      setLoading(false);
    }
  };

  const addRepo = async (fullName: string) => {
    if (!token) return;
    if (!user?.isGitAccount) return;
    if (imported.length >= MAX_OPEN_SOURCE_REPOS) {
      toast.error(`You can link up to ${MAX_OPEN_SOURCE_REPOS} repositories. Remove one to add another.`);
      return;
    }
    const existing = (user?.projects ?? []).some((p) => (p.publicationUrl || '').trim() === `https://github.com/${fullName}`.trim());
    if (existing) {
      toast.message('Already in projects.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/github/repo/${encodeURIComponent(fullName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string; project?: unknown } | null;
      if (!res.ok || !data?.success || !data.project) throw new Error(data?.message || 'Failed to load repo.');
      const next = [...(user?.projects ?? []), data.project as any];
      // Preserve GitHub-linked state so Connected accounts and sync dialog stay in sync.
      // Cast to any because auth flags live on the outer user object, while updateProfile
      // helper is typed for profile fields only.
      await updateProfile({ projects: next, isGitAccount: true } as any);
      toast.success('Added to projects.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const removeImported = async (repoFullName: string) => {
    const next = (user?.projects ?? []).filter((p) => (p as any).repoFullName !== repoFullName);
    setSaving(true);
    try {
      await updateProfile({ projects: next as any });
      toast.success('Removed.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => (r.full_name || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q));
  }, [repos, query]);

  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        variant="openSource"
        onPrimaryAction={() => { setDialogOpen(true); void fetchRepos(); }}
        disabled={loading || saving}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {imported.length === 0 ? (
          <div className="col-span-2">
            <SettingsSectionEmptyState
              icon={Code2}
              title="No Repositories Linked"
              tagline="Sync your GitHub projects to display your coding activity."
              addLabel="Initialize Sync"
              onAdd={() => { setDialogOpen(true); void fetchRepos(); }}
            />
          </div>
        ) : (
          imported.map((p, i) => (
            <OpenSourceCard
              key={(p as any).repoFullName ?? i}
              item={p}
              index={i}
              saving={saving}
              onOpen={() => { if (p.publicationUrl) window.open(p.publicationUrl, '_blank', 'noopener,noreferrer'); }}
              onDetach={() => removeImported((p as any).repoFullName || '')}
            />
          ))
        )}
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center justify-center size-8 border-2 border-primary/30 bg-primary/10 text-primary">
              <Github className="size-4" />
            </span>
            Add open source
          </span>
        }
        titleId="open-source-import"
        subtitle={user?.isGitAccount ? 'Pick a repo to add to Projects.' : 'Link GitHub in Security → Connected accounts to import repos.'}
        panelClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {user?.isGitAccount ? 'Uses your linked GitHub token' : 'GitHub not linked'}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDialogOpen(false)} className={settingsBtnSecondary}>Close</button>
              <button type="button" onClick={() => void fetchRepos()} disabled={!user?.isGitAccount || loading} className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-5 py-2.5 text-xs tracking-wide')}>{loading ? 'Loading…' : 'Refresh'}</button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="border-2 border-destructive/60 bg-destructive/5 px-3 py-2 text-xs text-destructive font-medium">
              {error}
            </div>
          )}
          <FormInput
            id="os-search"
            label="Search repos"
            placeholder="Search by name (owner/repo)"
            maxLength={80}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="border-2 border-border bg-muted/10">
            <div className="flex items-center justify-between gap-3 border-b-2 border-border px-3 py-2 bg-muted/20">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Repositories</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{filtered.length}</p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {!user?.isGitAccount ? (
                <div className="p-4 text-xs text-muted-foreground">
                  GitHub is not linked. Go to <span className="font-bold">Security → Connected accounts</span> and connect GitHub.
                </div>
              ) : loading ? (
                <div className="p-4 text-xs text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">No repos found.</div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((r) => {
                    const already = (user?.projects ?? []).some((p) => (p.publicationUrl || '').trim() === (r.html_url || '').trim());
                    return (
                      <div key={r.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase truncate">{r.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground truncate">{r.full_name}</p>
                          {r.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a href={r.html_url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border-2 border-border bg-card text-[10px] font-black uppercase tracking-widest hover:bg-muted/30">View</a>
                          <button type="button" onClick={() => void addRepo(r.full_name)} disabled={saving || already} className={cn(settingsBtnPrimary, settingsBtnShadowSm, 'px-3 py-2 text-[10px] tracking-widest')}>{already ? 'Added' : 'Add'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

function SkeletonBar({ width = '100%', className }: { width?: string; className?: string }) {
  return (
    <div
      className={cn('h-2.5 bg-muted animate-pulse', className)}
      style={{ width }}
    />
  );
}

function SidebarSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      {/* Profile skeleton */}
      <div className="border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-4 flex items-center gap-3">
        <div className="size-10 bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBar width="70%" />
          <SkeletonBar width="50%" className="h-2" />
        </div>
      </div>
      {/* Nav skeleton */}
      <div className="border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-3 space-y-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-1.5">
            <div className="size-4 bg-muted animate-pulse shrink-0" />
            <SkeletonBar width={`${45 + ((i * 11) % 41)}%`} />
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
          <div className="h-32 bg-muted/30" />
        </div>
        <div className="space-y-3">
          <SkeletonBar width="25%" className="h-2" />
          <div className="flex items-center gap-4">
            <div className="size-20 bg-muted/30" />
            <SkeletonBar width="80px" className="h-8" />
          </div>
        </div>
      </div>
      <div className="space-y-4 pt-6 border-t-2 border-border/20">
        <SkeletonBar width="25%" className="h-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SkeletonBar width="20%" className="h-2" />
            <div className="h-10 bg-muted/30" />
          </div>
          <div className="space-y-2">
            <SkeletonBar width="20%" className="h-2" />
            <div className="h-10 bg-muted/30" />
          </div>
        </div>
        <div className="space-y-2">
          <SkeletonBar width="15%" className="h-2" />
          <div className="h-24 bg-muted/30" />
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
  const logout = useAuthStore((s) => s.logout);
  const collapsed = isSidebarOpen;
  const [activeSection, setActiveSection] = useState<SectionId>('edit-profile');
  const [contentLoading, setContentLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Account: true,
    Security: true,
    Other: true,
  });

  const validSectionIds = useMemo(() => NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)), []);

  // Re-validate auth when tab becomes visible so token refresh + user sync happen without full page reload
  useEffect(() => {
    if (typeof document === 'undefined' || !token) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [token, refreshUser]);

  useEffect(() => {
    const error = searchParams.get('error');
    const linked = searchParams.get('linked');
    const section = searchParams.get('section');
    if (error) {
      toast.error(decodeURIComponent(error));
      router.replace('/settings', { scroll: false });
    } else if (linked) {
      refreshUser();
      toast.success(`${decodeURIComponent(linked)} connected successfully.`);
      router.replace('/settings', { scroll: false });
    } else if (section && validSectionIds.includes(section as SectionId)) {
      setActiveSection(section as SectionId);
    }
  }, [searchParams, router, refreshUser, validSectionIds]);

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
          <div className="grid items-start gap-6 grid-cols-1 lg:grid-cols-[256px_1fr]">
            <aside className="overflow-hidden w-64">
              <SidebarSkeleton itemCount={totalItems + 1} />
            </aside>
            <main className="min-w-0">
              <div className="border-4 border-border bg-card p-6 md:p-10 shadow-[8px_8px_0px_0px_var(--border)] min-h-[600px]">
                <ContentSkeleton />
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[256px_1fr]">

          {/* SIDEBAR */}
          <aside className="w-full max-w-[256px] mx-auto lg:mx-0 space-y-4">
            {/* User Profile Brief */}
            <div className="border-4 border-border bg-card p-4 flex items-center gap-3 shadow-[4px_4px_0px_0px_var(--border)]">
              <div className="size-10 border-2 border-border bg-muted overflow-hidden shrink-0">
                <img src={user?.profileImg || user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase truncate">{user?.fullName || user?.name || 'Account'}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">@{user?.username || 'user'}</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] divide-y-2 divide-border overflow-hidden">
              {NAV_GROUPS.map((group) => {
                const isOpen = !!openGroups[group.heading];
                return (
                  <div key={group.heading} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.heading)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors w-full text-left"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                        {group.heading}
                      </span>
                      <ChevronDown className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-180')} />
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
                                  type="button"
                                  onClick={() => handleSectionChange(item.id)}
                                  className={cn(
                                    'w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold border-l-4 transition-all',
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
              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="size-4" /> Log Out
              </button>
            </nav>
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0">
            <div className="border-4 border-border bg-card p-6 md:p-10 shadow-[8px_8px_0px_0px_var(--border)] min-h-[600px]">
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
                    {activeSection === 'certifications' && <CertificationsContent />}
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
                    {!['edit-profile', 'stack-tools', 'my-setup', 'work-experiences', 'education', 'certifications', 'projects', 'open-source', 'security-email', 'connected-accounts', 'syntax-card', 'notifications'].includes(activeSection) && (
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
