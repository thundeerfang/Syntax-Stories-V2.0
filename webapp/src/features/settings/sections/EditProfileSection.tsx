'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Camera,
  Link2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Sigma,
  LinkedinIcon,
  Github,
  Instagram,
  Youtube,
  ExternalLink,
  Globe,
  Image as LucideImage,
} from 'lucide-react';
import { OptimizedRemoteImage } from '@/components/ui/media';
import { cn } from '@/lib/core/utils';
import {
  PROFILE_INSTAGRAM_MAX,
  PROFILE_PORTFOLIO_URL_MAX,
  PROFILE_PORTFOLIO_URL_MIN,
  PROFILE_SOCIAL_URL_MAX,
  PROFILE_SOCIAL_URL_MIN,
} from '@/lib/profile/profileLinkLimits';
import { settingsBtnBlockPrimaryMd, settingsBtnIconFab } from '@/app/settings/buttonStyles';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { ImageUploadCropDialog } from '@/components/upload';
import { uploadAvatar, uploadCover } from '@/api/upload';
import { GhostOutlineButton } from '@/components/ui';
import { ToggleGroup, ToggleGroupItem } from '@/components/retroui';
import {
  SettingsTabPanel,
  SettingsTabRoot,
} from '@/app/settings/settings-list/SettingsSectionHeading';
import { PresenceIndicatorSettingsCard } from '../components/PresenceIndicatorSettingsCard';

export function EditProfileContent() {
  const { user, updateProfile, refreshUser, token } = useSettingsAuthSlice();
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
  const [profileImgAlt, setProfileImgAlt] = useState(
    (user as { profileImgAlt?: string })?.profileImgAlt ?? ''
  );
  const [coverBannerAlt, setCoverBannerAlt] = useState(
    (user as { coverBannerAlt?: string })?.coverBannerAlt ?? ''
  );
  const [portfolioUrl, setPortfolioUrl] = useState((user as any)?.portfolioUrl ?? '');
  const [profileLocation, setProfileLocation] = useState(
    (user as { profileLocation?: string })?.profileLocation ?? ''
  );
  const [linkedin, setLinkedin] = useState(user?.linkedin ?? '');
  const [github, setGithub] = useState(user?.github ?? '');
  const [instagram, setInstagram] = useState(user?.instagram ?? '');
  const [youtube, setYoutube] = useState(user?.youtube ?? '');
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const symbolsRef = useRef<HTMLDivElement>(null);
  const [formatActive, setFormatActive] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const selectionHasStyle = useCallback(
    (
      root: HTMLElement,
      predicate: (element: HTMLElement, computed: CSSStyleDeclaration) => boolean
    ) => {
      if (typeof window === 'undefined') return false;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      if (!root.contains(container)) return false;

      let node: Node | null =
        selection.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? selection.anchorNode
          : (selection.anchorNode?.parentElement ?? null);

      while (node && root.contains(node)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const computed = window.getComputedStyle(element);
          if (predicate(element, computed)) return true;
        }
        node = node.parentNode;
      }
      return false;
    },
    []
  );

  const updateFormatState = useCallback(() => {
    const el = bioEditorRef.current;
    if (!el || typeof document === 'undefined') return;
    if (document.activeElement !== el) {
      setFormatActive({ bold: false, italic: false, underline: false });
      return;
    }
    setFormatActive({
      bold: selectionHasStyle(el, (element, computed) => {
        const fontWeight = computed.fontWeight;
        const numericWeight = Number.parseInt(fontWeight, 10);
        return (
          element.tagName === 'B' ||
          element.tagName === 'STRONG' ||
          fontWeight === 'bold' ||
          (!Number.isNaN(numericWeight) && numericWeight >= 600)
        );
      }),
      italic: selectionHasStyle(
        el,
        (element, computed) =>
          element.tagName === 'I' || element.tagName === 'EM' || computed.fontStyle === 'italic'
      ),
      underline: selectionHasStyle(el, (element, computed) => {
        const textDecoration = computed.textDecorationLine || computed.textDecoration;
        return element.tagName === 'U' || textDecoration.includes('underline');
      }),
    });
  }, [selectionHasStyle]);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setUsername(user?.username ?? '');
    setBio(user?.bio ?? '');
    setProfileImg(user?.profileImg ?? '');
    setProfileImgBlurDataUrl(null);
    setCoverBanner(user?.coverBanner ?? '');
    setCoverBannerBlurDataUrl(null);
    setProfileImgAlt((user as { profileImgAlt?: string })?.profileImgAlt ?? '');
    setCoverBannerAlt((user as { coverBannerAlt?: string })?.coverBannerAlt ?? '');
    setPortfolioUrl((user as any)?.portfolioUrl ?? '');
    setProfileLocation((user as { profileLocation?: string })?.profileLocation ?? '');
    setLinkedin(user?.linkedin ?? '');
    setGithub(user?.github ?? '');
    setInstagram(user?.instagram ?? '');
    setYoutube(user?.youtube ?? '');
  }, [user]);

  useEffect(() => {
    if (!symbolsOpen) return;
    const close = (e: MouseEvent) => {
      if (symbolsRef.current && !symbolsRef.current.contains(e.target as Node))
        setSymbolsOpen(false);
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

  const handleCoverUploadSuccess = async (
    result: { url: string; blurDataUrl?: string },
    imageTitle?: string
  ) => {
    setCoverBanner(result.url);
    setCoverBannerBlurDataUrl(result.blurDataUrl ?? null);
    const alt = imageTitle?.trim();
    if (alt) setCoverBannerAlt(alt);
    try {
      await updateProfile(
        alt ? { coverBanner: result.url, coverBannerAlt: alt } : { coverBanner: result.url },
        { section: 'basic' }
      );
    } catch {
      // already set in state; user can Save again if needed
    }
  };

  const handleProfilePicUploadSuccess = async (
    result: { url: string; blurDataUrl?: string },
    imageTitle?: string
  ) => {
    setProfileImg(result.url);
    setProfileImgBlurDataUrl(result.blurDataUrl ?? null);
    const alt = imageTitle?.trim();
    if (alt) setProfileImgAlt(alt);
    try {
      await updateProfile(
        alt ? { profileImg: result.url, profileImgAlt: alt } : { profileImg: result.url },
        { section: 'basic' }
      );
    } catch {
      // already set in state; user can Save again if needed
    }
  };

  const markdownToHtml = (raw: string) => {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  const BIO_SYMBOLS = [
    '•',
    '◦',
    '▪',
    '–',
    '—',
    '·',
    '…',
    '©',
    '®',
    '™',
    '✓',
    '✔',
    '→',
    '←',
    '§',
    '¶',
    '°',
    '±',
    '×',
    '÷',
  ];

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
    const text = (e.clipboardData.getData('text/plain') ?? '').slice(
      0,
      Math.max(0, BIO_MAX_LENGTH - bio.length)
    );
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
    const t = (s: string | undefined | null) => (s ?? '').trim();
    const same =
      t(fullName) === t(user.fullName) &&
      t(username) === t(user.username) &&
      t(bio) === t(user.bio) &&
      t(profileImg) === t(user.profileImg) &&
      t(profileImgAlt) === t((user as { profileImgAlt?: string }).profileImgAlt) &&
      t(coverBanner) === t(user.coverBanner) &&
      t(coverBannerAlt) === t((user as { coverBannerAlt?: string }).coverBannerAlt) &&
      t(portfolioUrl) === t((user as { portfolioUrl?: string }).portfolioUrl) &&
      t(profileLocation) === t((user as { profileLocation?: string }).profileLocation) &&
      t(linkedin) === t(user.linkedin) &&
      t(github) === t(user.github) &&
      t(instagram) === t(user.instagram) &&
      t(youtube) === t(user.youtube);
    if (same) {
      toast.error('No changes to save.', { id: 'syntax-no-changes' });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        profileImg: profileImg.trim() || undefined,
        profileImgAlt: profileImgAlt.trim() || undefined,
        coverBanner: coverBanner.trim() || undefined,
        coverBannerAlt: coverBannerAlt.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        profileLocation: profileLocation.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        github: github.trim() || undefined,
        instagram: instagram.trim() || undefined,
        youtube: youtube.trim() || undefined,
      });
      toast.success('Profile updated.', { id: 'syntax-profile-success' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile.', {
        id: 'syntax-profile-error',
      });
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
    <SettingsTabRoot>
      <SettingsTabPanel className="space-y-5">
        {/* Overlapping header with cover + avatar + edit icons */}
        <section className="border-4 border-border bg-card overflow-hidden">
          <div className="relative h-40 w-full overflow-hidden border-b-4 border-border">
            {coverBanner ? (
              <OptimizedRemoteImage
                src={coverBanner}
                alt={coverBannerAlt.trim() || 'Cover banner'}
                title={coverBannerAlt.trim() || undefined}
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
                <div className="relative size-20 md:size-24 border-2 border-border shadow bg-muted overflow-hidden">
                  <OptimizedRemoteImage
                    src={profileImg || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                    alt={profileImgAlt.trim() || 'Profile photo'}
                    title={profileImgAlt.trim() || undefined}
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
                  Update your photo, cover, bio, username, and social links.
                </p>
              </div>
            </div>
          </div>
        </section>

        <ImageUploadCropDialog
          open={coverDialogOpen}
          onClose={() => setCoverDialogOpen(false)}
          titleId="settings-cover-crop"
          title="Upload cover image"
          titleIcon={<LucideImage className="size-4 shrink-0 text-primary" aria-hidden />}
          subtitle="JPEG, PNG, GIF or WebP. Max 10 MB."
          subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
          maxSizeBytes={10 * 1024 * 1024}
          aspect={4}
          cropMinHeightClass="min-h-[20rem] h-80"
          imageTitleField
          imageTitleLabel="Cover title (optional)"
          imageTitlePlaceholder="e.g. Team offsite banner"
          confirmLabel="Save & upload"
          onConfirm={async (file, meta) => {
            if (!token) throw new Error('Not signed in.');
            const data = await uploadCover(token, file);
            if (!data.url) throw new Error(data.message ?? 'Upload failed');
            void handleCoverUploadSuccess(
              { url: data.url, blurDataUrl: data.blurDataUrl },
              meta?.imageTitle
            );
            toast.success('Cover image updated.');
          }}
        />
        <ImageUploadCropDialog
          open={profilePicDialogOpen}
          onClose={() => setProfilePicDialogOpen(false)}
          titleId="settings-avatar-crop"
          title="Upload profile photo"
          titleIcon={<Camera className="size-4 shrink-0 text-primary" aria-hidden />}
          subtitle="JPEG, PNG, GIF or WebP. Max 5 MB."
          subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
          maxSizeBytes={5 * 1024 * 1024}
          aspect={1}
          imageTitleField
          imageTitleLabel="Photo title (optional)"
          imageTitlePlaceholder="e.g. Headshot, 2025"
          confirmLabel="Save & upload"
          onConfirm={async (file, meta) => {
            if (!token) throw new Error('Not signed in.');
            const data = await uploadAvatar(token, file);
            if (!data.url) throw new Error(data.message ?? 'Upload failed');
            void handleProfilePicUploadSuccess(
              { url: data.url, blurDataUrl: data.blurDataUrl },
              meta?.imageTitle
            );
            toast.success('Profile photo updated.');
          }}
        />

        {/* Basic info — card */}
        <section className="border-4 border-border bg-card p-5">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">
            Basic information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Full name
              </label>
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
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Username
              </label>
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
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Location
              </label>
              <input
                type="text"
                value={profileLocation}
                onChange={(e) => setProfileLocation(e.target.value)}
                placeholder="City, country"
                maxLength={180}
                className="w-full p-3 border-2 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm transition-shadow"
              />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Short bio
            </label>
            <div className="border-2 border-border bg-background transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <ToggleGroup
                type="multiple"
                value={
                  [
                    formatActive.bold && 'bold',
                    formatActive.italic && 'italic',
                    formatActive.underline && 'underline',
                  ].filter(Boolean) as string[]
                }
                onValueChange={() => {}}
                className="w-full justify-start border-0 bg-muted/30 p-1 shadow-none flex-wrap gap-0 [&_button[data-state=on]]:bg-primary [&_button[data-state=on]]:text-white"
              >
                <ToggleGroupItem
                  value="bold"
                  aria-label="Bold"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBioFormat('bold')}
                >
                  <Bold className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="italic"
                  aria-label="Italic"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBioFormat('italic')}
                >
                  <Italic className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="underline"
                  aria-label="Underline"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBioFormat('underline')}
                >
                  <Underline className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="list"
                  aria-label="Bullet list"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBioList('bullet')}
                >
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="numbered"
                  aria-label="Numbered list"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBioList('numbered')}
                >
                  <ListOrdered className="h-4 w-4" />
                </ToggleGroupItem>
                <div className="relative inline-flex" ref={symbolsRef}>
                  <ToggleGroupItem
                    value="symbols"
                    aria-label="Insert symbol"
                    aria-expanded={symbolsOpen}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSymbolsOpen((o) => !o)}
                    className={symbolsOpen ? 'bg-primary text-white' : ''}
                  >
                    <Sigma className="h-4 w-4" />
                  </ToggleGroupItem>
                  {symbolsOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] border-2 border-border bg-card p-2 shadow">
                      <p className="mb-2 text-[9px] font-bold uppercase text-muted-foreground">
                        Insert symbol
                      </p>
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
              <p
                id="bio-char-count"
                className="text-right text-[9px] text-muted-foreground px-3 pb-2"
              >
                {bio.length} / {BIO_MAX_LENGTH}
              </p>
            </div>
          </div>
        </section>

        {/* Portfolio URL — card */}
        <section className="border-4 border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-border bg-muted/30">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Portfolio URL
              </h3>
              <p className="text-[9px] font-medium text-muted-foreground/80">
                Showcase your work with a single link.
              </p>
            </div>
          </div>
          <div className="relative flex items-center">
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value.slice(0, PROFILE_PORTFOLIO_URL_MAX))}
              placeholder="https://your-portfolio.com"
              maxLength={PROFILE_PORTFOLIO_URL_MAX}
              className={cn(
                'w-full border-2 border-border bg-background py-2.5 pr-10 pl-3 font-medium text-sm outline-none transition-colors ',
                'placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20'
              )}
              aria-label="Portfolio URL"
              aria-describedby="portfolio-url-hint"
            />
            {portfolioUrl.trim() && (
              <a
                href={
                  portfolioUrl.trim().startsWith('http')
                    ? portfolioUrl.trim()
                    : `https://${portfolioUrl.trim()}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2.5 flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                aria-label="Open portfolio"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <p id="portfolio-url-hint" className="mt-1.5 text-[9px] text-muted-foreground">
            {PROFILE_PORTFOLIO_URL_MIN}–{PROFILE_PORTFOLIO_URL_MAX} characters (leave blank if
            none).
          </p>
        </section>

        {/* Social links — card */}
        <section className="border-4 border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-border bg-muted/30">
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Social links
              </h3>
              <p className="text-[9px] font-medium text-muted-foreground/80">
                Add your profiles so others can find you.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'linkedin' as const,
                label: 'LinkedIn',
                value: linkedin,
                set: setLinkedin,
                placeholder: 'https://linkedin.com/in/username',
                Icon: LinkedinIcon,
                iconBg: 'bg-[#0A66C2]/10',
                iconColor: 'text-[#0A66C2]',
                maxLen: PROFILE_SOCIAL_URL_MAX,
              },
              {
                key: 'github' as const,
                label: 'GitHub',
                value: github,
                set: setGithub,
                placeholder: 'https://github.com/username',
                Icon: Github,
                iconBg: 'bg-foreground/10',
                iconColor: 'text-foreground',
                maxLen: PROFILE_SOCIAL_URL_MAX,
              },
              {
                key: 'instagram' as const,
                label: 'Instagram',
                value: instagram,
                set: setInstagram,
                placeholder: 'https://instagram.com/username',
                Icon: Instagram,
                iconBg: 'bg-[#E4405F]/10',
                iconColor: 'text-[#E4405F]',
                maxLen: PROFILE_INSTAGRAM_MAX,
              },
              {
                key: 'youtube' as const,
                label: 'YouTube',
                value: youtube,
                set: setYoutube,
                placeholder: 'https://youtube.com/@channel',
                Icon: Youtube,
                iconColor: 'text-[#FF0000]',
                iconBg: 'bg-[#FF0000]/10',
                maxLen: PROFILE_SOCIAL_URL_MAX,
              },
            ].map(({ key, label, value, set, placeholder, Icon, iconBg, iconColor, maxLen }) => (
              <div key={key} className="group space-y-1.5">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center border-2 border-border',
                      iconBg,
                      iconColor
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={key === 'instagram' ? 'text' : 'url'}
                    value={value}
                    onChange={(e) => set(e.target.value.slice(0, maxLen))}
                    placeholder={placeholder}
                    maxLength={maxLen}
                    className={cn(
                      'w-full border-2 border-border bg-background py-2.5 pr-10 pl-3 font-medium text-sm outline-none transition-colors ',
                      'placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    )}
                    aria-label={label}
                  />
                  {value.trim() && (
                    <a
                      href={
                        value.trim().startsWith('http') ? value.trim() : `https://${value.trim()}`
                      }
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
          <p className="mt-3 text-[9px] text-muted-foreground">
            LinkedIn, GitHub, YouTube: {PROFILE_SOCIAL_URL_MIN}–{PROFILE_SOCIAL_URL_MAX} characters
            per URL when non-empty. Instagram: up to {PROFILE_INSTAGRAM_MAX} characters.
          </p>
        </section>

        <PresenceIndicatorSettingsCard profileImg={user?.profileImg} username={user?.username} />

        <div className="flex items-center justify-end gap-3 pt-2">
          <GhostOutlineButton
            type="button"
            onClick={() => refreshUser()}
            size="md"
            className="text-muted-foreground hover:text-foreground"
          >
            Reset
          </GhostOutlineButton>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              settingsBtnBlockPrimaryMd,
              'px-6 py-2.5 text-[11px] tracking-widest disabled:opacity-60'
            )}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </SettingsTabPanel>
    </SettingsTabRoot>
  );
}
