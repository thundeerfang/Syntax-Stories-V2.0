'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useSidebar } from '@/hooks/useSidebar';
import { blogApi, pickRemoteThumbnailForApi } from '@/api/blog';
import { squadsApi, type SquadSummary } from '@/api/squads';
import { uploadCover } from '@/api/upload';
import { BlogWritePageSkeletonInner } from '@/components/skeletons';
import { Dialog } from '@/components/ui/dialog';
import { ImageUploadCropDialog } from '@/components/upload';
import { ConfirmDialog } from '@/components/ui/dialog';
import { BlogWriteDeployOverlay } from '@/features/blog';
import type { BlogPublishTaxonomy } from '@/lib/blog/blogPublishTaxonomy';
import type { BlogTaxonomyRow } from '@/types/blog';
import {
  Save, Send, ChevronRight,
  Activity, Cpu, History, ListTree, Wrench,
  Globe, ShieldCheck, Image as ImageIcon, Trash2, Pencil,
  Bold, Italic, Underline as UnderlineIcon,
  Link2, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight,
  FileText, UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/core/utils';
import { resolveSameOriginRequestUrl } from '@/lib/api/publicApiBase';
import {
  BLOG_POST_THUMBNAIL_ASPECT,
  BLOG_POST_THUMBNAIL_ASPECT_CLASS,
} from '@/lib/blog/blogPostThumbnailAspect';
import { getWriteEditorSessionPostId, setWriteEditorSessionPostId } from '@/lib/blog/writeBlogSession';
import {
  blockTypeDisplayName,
  totalWorkspaceWordCount,
} from '@/lib/blog/writeWorkspaceStats';
import {
  BlogWriteEditor,
  Block,
  createBlockInSection,
  stripLegacyGifBlocks,
  type BlockType,
} from '@/components/ui/editor';
import { DEFAULT_ITEMS } from '@/components/ui/editor';
import { motion, AnimatePresence } from 'framer-motion';


import {
  SummaryEditor,
  BlogWriteTopNav,
  useBlogWritePageSyncEffects,
  useBlogWriteServerDraftSync,
  thumbnailPreviewFromApi,
  TITLE_MAX,
  SUMMARY_MAX_WORDS,
  serializeWriteWorkspace,
  summaryWordCount,
  draftSyncBadgeTitle,
  draftSyncBadgeLabel,
  MAX_BLOCKS_PER_SECTION,
  type RevisionKind,
  type RevisionEntry,
  formatRevisionWhen,
  revisionKindBadgeClass,
  PRIMARY_SECTION_ID,
  THUMB_MAX_MB,
  REVISIONS_SIDEBAR_VISIBLE,
  resolveCentreMaxWidthClass,
  taxonomyApiFields,
  taxonomyPayload,
  type WriteFocusChrome,
  type DraftSyncUi,
  focusContextLabel,
  runBlogWriteSubmit,
} from './blogWritePageUtils';

export default function WriteBlogPage() {
  const { user, token, shouldBlock } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen } = useSidebar();
  const [title, setTitle] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [thumbnailDialogOpen, setThumbnailDialogOpen] = useState(false);
  const [postCategory, setPostCategory] = useState('');
  const [postTags, setPostTags] = useState<string[]>([]);
  const [postLanguage, setPostLanguage] = useState('en');
  const [taxonomyCategories, setTaxonomyCategories] = useState<BlogTaxonomyRow[]>([]);
  const [taxonomyTags, setTaxonomyTags] = useState<BlogTaxonomyRow[]>([]);
  const [deployOverlayOpen, setDeployOverlayOpen] = useState(false);
  /** Snapshot for deploy overlay squad dropdown seed when it opens. */
  const [deployOverlayInitialSquadId, setDeployOverlayInitialSquadId] = useState<string | null>(null);
  const [mySquadsForPublish, setMySquadsForPublish] = useState<
    Pick<SquadSummary, '_id' | 'name' | 'slug'>[]
  >([]);
  const [publishDialogSnapshot, setPublishDialogSnapshot] = useState<BlogPublishTaxonomy>({
    category: '', tags: [],
    language: 'en',
  });
  const [summary, setSummary] = useState('');
  const [blocks, setBlocks] = useState<Block[]>(() => []);
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'published' | 'metadata' | null>(null);
  /** Empty until client mount — avoids SSR/client `toLocaleTimeString()` mismatch. */
  const [currentTime, setCurrentTime] = useState('');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [draftSyncStatus, setDraftSyncStatus] = useState<'idle' | 'offline' | 'local' | 'syncing' | 'synced'>('idle');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [loadedPostStatus, setLoadedPostStatus] = useState<'draft' | 'published' | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [contentBaseline, setContentBaseline] = useState<string | null>(null);
  const [focusChrome, setFocusChrome] = useState<WriteFocusChrome>(null);
  const [activeBodyBlock, setActiveBodyBlock] = useState<Block | null>(null);
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [revisionHistoryOpen, setRevisionHistoryOpen] = useState(false);
  const revisionDialogScrollRef = useRef<HTMLDivElement>(null);
  const revisionHistorySectionRef = useRef<HTMLDivElement>(null);
  const prevRightSidebarOpenRef = useRef(true);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const latestForSyncRef = useRef({ title: '', summary: '', blocks: [] as Block[], thumbnailPreviewUrl: null as string | null });
  const tokenRef = useRef<string | undefined>(token);
  const squadMongoIdRef = useRef<string | null>(null);
  const skipNextPopStateRef = useRef(false);
  const autosyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRevisionSessionKeyRef = useRef<string | null>(null);
  const prevDraftSyncForRevisionRef = useRef<DraftSyncUi>('idle');
  const lastAutosyncRevisionAtRef = useRef(0);
  const idleEditRevisionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEditedRevisionAtRef = useRef(0);
  latestForSyncRef.current = { title, summary, blocks, thumbnailPreviewUrl };
  tokenRef.current = token;

  useEffect(() => {
    let cancelled = false;
    void blogApi
      .getTaxonomy()
      .then((r) => {
        if (cancelled) return;
        setTaxonomyCategories(r.categories);
        setTaxonomyTags(r.tags);
      })
      .catch(() => {
        // suggestions optional
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setMySquadsForPublish([]);
      return;
    }
    let cancelled = false;
    void squadsApi
      .listMine(token)
      .then((r) => {
        if (cancelled) return;
        setMySquadsForPublish(r.squads.map((s) => ({ _id: s._id, name: s.name, slug: s.slug })));
      })
      .catch(() => {
        if (!cancelled) setMySquadsForPublish([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!revisionHistoryOpen) return;
    const el = revisionDialogScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = 0;
    });
  }, [revisionHistoryOpen]);

  useEffect(() => {
    if (rightSidebarOpen) {
      const wasClosed = !prevRightSidebarOpenRef.current;
      if (wasClosed) {
        requestAnimationFrame(() => {
          revisionHistorySectionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    }
    prevRightSidebarOpenRef.current = rightSidebarOpen;
  }, [rightSidebarOpen]);

  const appendRevision = useCallback((entry: Omit<RevisionEntry, 'id'>) => {
    const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setRevisions((prev) => [{ id, ...entry }, ...prev].slice(0, 500));
  }, []);

  const revisionSessionKey = `${token ?? 'anon'}:${activePostId ?? 'scratch'}:${loadedPostStatus ?? 'none'}`;

  const primarySectionBlocks = useMemo(
    () => blocks.filter((b) => (b.sectionId ?? PRIMARY_SECTION_ID) === PRIMARY_SECTION_ID),
    [blocks],
  );

  const totalWords = useMemo(
    () => totalWorkspaceWordCount({ title, summaryHtml: summary, blocks }),
    [title, summary, blocks],
  );

  const handleBodyActiveBlock = useCallback((b: Block | null) => {
    setFocusChrome('body');
    setActiveBodyBlock(b);
  }, []);

  const captureBaseline = useCallback(() => {
    setContentBaseline(serializeWriteWorkspace({ title, summary, blocks, thumbnailPreviewUrl }));
  }, [title, summary, blocks, thumbnailPreviewUrl]);

  const isDirty = useMemo(() => {
    if (!workspaceReady || contentBaseline === null) return false;
    return (
      contentBaseline !== serializeWriteWorkspace({ title, summary, blocks, thumbnailPreviewUrl })
    );
  }, [workspaceReady, contentBaseline, title, summary, blocks, thumbnailPreviewUrl]);

  const saveDisabledNoEdits = activePostId !== null && !isDirty;

  const [squadWriteCtx, setSquadWriteCtx] = useState<{ slug: string; name: string } | null>(null);

  useEffect(() => {
    const slug = searchParams.get('squad')?.trim();
    if (!slug || !token) {
      squadMongoIdRef.current = null;
      setSquadWriteCtx(null);
      return;
    }
    let cancelled = false;
    void squadsApi
      .getBySlug(slug, token)
      .then((r) => {
        if (cancelled) return;
        squadMongoIdRef.current = r.squad._id;
        setSquadWriteCtx({ slug: r.squad.slug, name: r.squad.name });
      })
      .catch(() => {
        if (cancelled) return;
        squadMongoIdRef.current = null;
        setSquadWriteCtx(null);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, token]);

  const { syncDraftToServer } = useBlogWriteServerDraftSync({
    setDraftSyncStatus,
    setActivePostId,
    setLoadedPostStatus,
    activePostId,
    loadedPostStatus,
    refs: { latestForSyncRef, tokenRef, squadMongoIdRef },
  });

  useEffect(() => {
    if (!workspaceReady || !token) return;
    if (lastRevisionSessionKeyRef.current === revisionSessionKey) return;
    lastRevisionSessionKeyRef.current = revisionSessionKey;
    const at = Date.now();
    const id = `r-${at}-boot`;
    const first: RevisionEntry = activePostId
      ? {
          id,
          kind: 'opened',
          label:
            loadedPostStatus === 'published'
              ? 'Published post opened from server'
              : 'Draft opened from server',
          at,
        }
      : { id, kind: 'initial', label: 'Initial blog', at };
    setRevisions([first]);
    prevDraftSyncForRevisionRef.current = draftSyncStatus;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit draftSyncStatus: listing it would reset revision history on every sync transition; value here only seeds prev ref when session/workspace identity changes
  }, [workspaceReady, token, revisionSessionKey, activePostId, loadedPostStatus]);

  useEffect(() => {
    if (!workspaceReady) return;
    const prev = prevDraftSyncForRevisionRef.current;
    prevDraftSyncForRevisionRef.current = draftSyncStatus;
    if (prev !== 'syncing' || draftSyncStatus !== 'synced') return;
    const now = Date.now();
    if (now - lastAutosyncRevisionAtRef.current < 90_000) return;
    lastAutosyncRevisionAtRef.current = now;
    appendRevision({ kind: 'autosynced', label: 'Draft synced to server', at: now });
  }, [draftSyncStatus, workspaceReady, appendRevision]);

  useEffect(() => {
    if (!workspaceReady || !isDirty) return;
    if (idleEditRevisionTimerRef.current) clearTimeout(idleEditRevisionTimerRef.current);
    idleEditRevisionTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastEditedRevisionAtRef.current < 4 * 60 * 1000) return;
      lastEditedRevisionAtRef.current = now;
      appendRevision({ kind: 'edited', label: 'Content updated', at: now });
    }, 8000);
    return () => {
      if (idleEditRevisionTimerRef.current) clearTimeout(idleEditRevisionTimerRef.current);
    };
  }, [title, summary, blocks, isDirty, workspaceReady, appendRevision]);

  useEffect(() => {
    try {
      globalThis.localStorage?.removeItem('syntax-stories-blog-draft');
    } catch {
      // ignore
    }
  }, []);

  /** Legacy `?postId=` → sessionStorage only (id never stays in the address bar). */
  useEffect(() => {
    const legacy = searchParams.get('postId');
    if (!legacy) return;
    setWriteEditorSessionPostId(legacy);
    router.replace('/blogs/write', { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (!token) {
      setContentBaseline(null);
      setWorkspaceReady(true);
      return;
    }
    let cancelled = false;
    setWorkspaceReady(false);
    setContentBaseline(null);
    lastRevisionSessionKeyRef.current = null;
    (async () => {
      try {
        const targetId = getWriteEditorSessionPostId();
        if (targetId) {
          const { post } = await blogApi.getMyPost(targetId, token);
          if (cancelled) return;
          let nextBlocks: Block[] = [];
          try {
            const parsed = JSON.parse(post.content) as unknown;
            if (Array.isArray(parsed)) nextBlocks = stripLegacyGifBlocks(parsed as Block[]);
          } catch {
            nextBlocks = [];
          }
          const nextTitle = post.title || '';
          const nextSummary = post.summary || '';
          const nextThumb = thumbnailPreviewFromApi(post.thumbnailUrl);
          setTitle(nextTitle);
          setSummary(nextSummary);
          setBlocks(nextBlocks);
          setThumbnailPreviewUrl(nextThumb);
          setThumbnailFile(null);
          setPostCategory(post.category ?? '');
          setPostTags(Array.isArray(post.tags) ? post.tags : []);
          setPostLanguage(post.language ?? 'en');
          setActivePostId(post._id);
          setLoadedPostStatus(post.status);
          setDraftSyncStatus('synced');
          setWriteEditorSessionPostId(post._id);
          setContentBaseline(
            serializeWriteWorkspace({
              title: nextTitle,
              summary: nextSummary,
              blocks: nextBlocks,
              thumbnailPreviewUrl: nextThumb,
            }),
          );
        } else {
          setActivePostId(null);
          setLoadedPostStatus(null);
          const { draft } = await blogApi.getDraft(token);
          if (cancelled) return;
          if (draft) {
            let nextBlocks: Block[] = [];
            try {
              const parsed = JSON.parse(draft.content) as unknown;
              if (Array.isArray(parsed)) nextBlocks = stripLegacyGifBlocks(parsed as Block[]);
            } catch {
              nextBlocks = [];
            }
            const nextTitle = draft.title || '';
            const nextSummary = draft.summary || '';
            const nextThumb = thumbnailPreviewFromApi(draft.thumbnailUrl);
            setTitle(nextTitle);
            setSummary(nextSummary);
            setBlocks(nextBlocks);
            setThumbnailPreviewUrl(nextThumb);
            setThumbnailFile(null);
            setPostCategory(draft.category ?? '');
            setPostTags(Array.isArray(draft.tags) ? draft.tags : []);
            setPostLanguage(draft.language ?? 'en');
            setActivePostId(draft._id);
            setLoadedPostStatus('draft');
            setDraftSyncStatus('synced');
            setWriteEditorSessionPostId(draft._id);
            setContentBaseline(
              serializeWriteWorkspace({
                title: nextTitle,
                summary: nextSummary,
                blocks: nextBlocks,
                thumbnailPreviewUrl: nextThumb,
              }),
            );
          } else {
            setTitle('');
            setSummary('');
            setBlocks([]);
            setPostCategory('');
            setPostTags([]);
            setPostLanguage('en');
            setThumbnailPreviewUrl(null);
            setThumbnailFile(null);
            setDraftSyncStatus('idle');
            setWriteEditorSessionPostId(null);
            setContentBaseline(
              serializeWriteWorkspace({
                title: '', summary: '', blocks: [],
                thumbnailPreviewUrl: null,
              }),
            );
          }
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Could not load editor');
      } finally {
        if (!cancelled) setWorkspaceReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !workspaceReady) return;
    const hasContent = title.trim() || blocks.length > 0;
    if (!hasContent || !navigator.onLine) return;
    if (autosyncTimerRef.current) clearTimeout(autosyncTimerRef.current);
    autosyncTimerRef.current = setTimeout(() => {
      void syncDraftToServer();
    }, 2800);
    return () => {
      if (autosyncTimerRef.current) clearTimeout(autosyncTimerRef.current);
    };
  }, [token, workspaceReady, title, summary, blocks, thumbnailPreviewUrl, syncDraftToServer]);

  const resizeTitleInput = useCallback(() => {
    const el = titleInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resizeTitleInput();
  }, [title, resizeTitleInput]);

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleThumbnailConfirm = useCallback(
    async (file: File) => {
      if (thumbnailPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(thumbnailPreviewUrl);
      if (token) {
        try {
          const data = await uploadCover(token, file, undefined, () => {});
          if (data.url) {
            setThumbnailFile(null);
            setThumbnailPreviewUrl(data.url);
            return;
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Thumbnail upload failed');
        }
      }
      setThumbnailFile(file);
      setThumbnailPreviewUrl(URL.createObjectURL(file));
    },
    [thumbnailPreviewUrl, token],
  );

  const clearThumbnail = useCallback(() => {
    if (thumbnailPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailFile(null);
    setThumbnailPreviewUrl(null);
  }, [thumbnailPreviewUrl]);

  const addBlock = useCallback(
    (type: BlockType) => {
      const count = blocks.filter(
        (b) => (b.sectionId ?? PRIMARY_SECTION_ID) === PRIMARY_SECTION_ID,
      ).length;
      if (count >= MAX_BLOCKS_PER_SECTION) {
        toast.error(`Limit reached (${MAX_BLOCKS_PER_SECTION} blocks)`);
        return;
      }
      setBlocks((prev) => [...prev, createBlockInSection(type, PRIMARY_SECTION_ID)]);
    },
    [blocks],
  );

  useBlogWritePageSyncEffects({
    title,
    summary,
    blocks,
    thumbnailPreviewUrl,
    isOnline,
    draftSyncStatus,
    isDirty,
    setIsOnline,
    setDraftSyncStatus,
    setLeaveConfirmOpen,
    syncDraftToServer,
    refs: {
      latestForSyncRef,
      tokenRef,
      skipNextPopStateRef,
    },
  });

  const handleLeaveConfirmYes = useCallback(() => {
    setLeaveConfirmOpen(false);
    skipNextPopStateRef.current = true;
    void (async () => {
      try {
        await syncDraftToServer();
      } catch {
        // sync errors already reflected in badge
      }
      history.back();
    })();
  }, [syncDraftToServer]);

  const handleLeaveConfirmNo = useCallback(() => {
    setLeaveConfirmOpen(false);
    history.pushState({ blogWriteGuard: true }, location.href);
  }, []);

  const openDeployOverlay = useCallback(() => {
    if (!title.trim()) {
      toast.error('ERROR: TITLE_REQUIRED');
      return;
    }
    setDeployOverlayInitialSquadId(squadMongoIdRef.current);
    setPublishDialogSnapshot({
      category: postCategory,
      tags: [...postTags],
      language: postLanguage,
    });
    setDeployOverlayOpen(true);
  }, [title, postCategory, postTags, postLanguage]);

  const executePublish = useCallback(
    async (taxonomy: BlogPublishTaxonomy, squadMongoId: string | null) => {
      if (!title.trim()) {
        toast.error('ERROR: TITLE_REQUIRED');
        return;
      }
      if (!token) return;
      squadMongoIdRef.current = squadMongoId;
      setDeployOverlayOpen(false);
      setSubmitting(true);
      setSubmitAction('published');
      try {
        await runBlogWriteSubmit({
          status: 'published',
          token,
          title,
          summary,
          blocks,
          thumbnailFile,
          thumbnailPreviewUrl,
          clearThumbnail,
          activePostId,
          setActivePostId,
          setLoadedPostStatus,
          setDraftSyncStatus,
          setTitle,
          setSummary,
          setBlocks,
          taxonomy,
          squadMongoId: squadMongoIdRef.current,
        });
        appendRevision({ kind: 'published', label: 'Post published', at: Date.now() });
        setContentBaseline(null);
        setPostCategory('');
        setPostTags([]);
        setPostLanguage('en');
      } catch (e) {
        console.error(e);
        toast.error('FATAL: UPLOAD_FAILED');
      } finally {
        setSubmitting(false);
        setSubmitAction(null);
      }
    },
    [
      title,
      token,
      summary,
      blocks,
      thumbnailFile,
      thumbnailPreviewUrl,
      clearThumbnail,
      activePostId,
      setDraftSyncStatus,
      appendRevision,
      setContentBaseline,
      setPostCategory,
      setPostTags,
      setPostLanguage,
    ],
  );

  const handleSavePostDetailsFromDialog = useCallback(
    async (tax: BlogPublishTaxonomy) => {
      if (!token) return;
      setPostCategory(tax.category);
      setPostTags(tax.tags);
      setPostLanguage(tax.language);
      setSubmitting(true);
      setSubmitAction('metadata');
      try {
        const content = JSON.stringify(stripLegacyGifBlocks(blocks));
        const summaryToSend =
          summary && summary !== '<br>' && summaryWordCount(summary) > 0 ? summary.trim() : undefined;
        const tr = taxonomyPayload(tax);
        const thumbUrl = pickRemoteThumbnailForApi(thumbnailPreviewUrl);
        const sq = squadMongoIdRef.current?.trim();
        const squadPayload = sq ? { squadId: sq } : {};
        if (activePostId) {
          const st = loadedPostStatus === 'published' ? 'published' : 'draft';
          await blogApi.updatePost(
            activePostId,
            {
              title: title.trim() || 'Untitled draft',
              summary: summaryToSend,
              content,
              thumbnailUrl: thumbUrl,
              status: st,
              category: tr.category || '',
              tags: tr.tags,
              language: tr.language,
              ...squadPayload,
            },
            token,
          );
        } else {
          const { post } = await blogApi.saveDraft(
            {
              title: title.trim() || 'Untitled draft',
              summary: summaryToSend,
              content,
              thumbnailUrl: thumbUrl,
              category: tr.category || '',
              tags: tr.tags,
              language: tr.language,
              ...squadPayload,
            },
            token,
          );
          setActivePostId(post._id);
          setLoadedPostStatus('draft');
          setWriteEditorSessionPostId(post._id);
        }
        toast.success('Classification saved to draft');
        appendRevision({ kind: 'draft_saved', label: 'Details updated', at: Date.now() });
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : 'Could not save details');
      } finally {
        setSubmitting(false);
        setSubmitAction(null);
      }
    },
    [
      token,
      blocks,
      summary,
      title,
      thumbnailPreviewUrl,
      activePostId,
      loadedPostStatus,
      appendRevision,
      setActivePostId,
      setLoadedPostStatus,
    ],
  );

  const handleSaveDraft = useCallback(
    async () => {
      if (!title.trim()) {
        toast.error('ERROR: TITLE_REQUIRED');
        return;
      }
      if (!token) return;
      setSubmitting(true);
      setSubmitAction('draft');
      try {
        await runBlogWriteSubmit({
          status: 'draft',
          token,
          title,
          summary,
          blocks,
          thumbnailFile,
          thumbnailPreviewUrl,
          clearThumbnail,
          activePostId,
          setActivePostId,
          setLoadedPostStatus,
          setDraftSyncStatus,
          setTitle,
          setSummary,
          setBlocks,
          taxonomy: { category: postCategory, tags: postTags, language: postLanguage },
          squadMongoId: squadMongoIdRef.current,
        });
        appendRevision({ kind: 'draft_saved', label: 'Draft saved', at: Date.now() });
        captureBaseline();
      } catch (e) {
        console.error(e);
        toast.error('FATAL: UPLOAD_FAILED');
      } finally {
        setSubmitting(false);
        setSubmitAction(null);
      }
    },
    [
      title,
      token,
      summary,
      blocks,
      thumbnailFile,
      thumbnailPreviewUrl,
      clearThumbnail,
      setDraftSyncStatus,
      activePostId,
      captureBaseline,
      appendRevision,
      postCategory,
      postTags,
      postLanguage,
    ],
  );

  if (shouldBlock) return <BlogWritePageSkeletonInner />;
  if (token && !workspaceReady) return <BlogWritePageSkeletonInner />;

  const centreMaxWidthClass = resolveCentreMaxWidthClass(leftSidebarOpen, rightSidebarOpen);

  return (
    <div
      className={cn(
        'ss-write-theme-transition flex h-screen max-h-screen w-full flex-col overflow-hidden border-2 border-border bg-background font-mono text-foreground shadow',
      )}
    >
      <BlogWriteTopNav
        username={user?.username || 'user'}
        title={title}
        focusChrome={focusChrome}
        activeBodyBlock={activeBodyBlock}
        hasDraftContent={Boolean(title.trim() || blocks.length > 0)}
        loadedPostStatus={loadedPostStatus}
        leftSidebarOpen={leftSidebarOpen}
        onToggleLeft={() => setLeftSidebarOpen((o) => !o)}
        rightSidebarOpen={rightSidebarOpen}
        onToggleRight={() => setRightSidebarOpen((o) => !o)}
        draftSyncStatus={draftSyncStatus}
        currentTime={currentTime}
      />
      {squadWriteCtx ? (
        <div className="flex flex-wrap items-center justify-center gap-2 border-b-2 border-border bg-primary/10 px-3 py-2 text-center text-[10px] font-black uppercase tracking-wide text-foreground">
          <UsersRound className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
          <span className="text-muted-foreground">Squad post</span>
          <Link
            href={`/squads/${encodeURIComponent(squadWriteCtx.slug)}`}
            className="text-primary underline decoration-2 underline-offset-2"
          >
            {squadWriteCtx.name}
          </Link>
        </div>
      ) : null}

      {/* 2. MAIN WORKBENCH - flex so centre expands when sidebars collapse */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT SIDEBAR: animated width, icon strip when collapsed */}
        <motion.div
          initial={false}
          animate={{ width: leftSidebarOpen ? 280 : 56 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'flex-shrink-0 flex flex-col border-r-2 border-border bg-muted/20 overflow-hidden min-h-full',
            'hidden lg:flex',
          )}
        >
          <AnimatePresence mode="wait">
            {leftSidebarOpen ? (
              <motion.div
                key="left-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex h-full min-h-0 w-[280px] flex-col p-4"
              >
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" /> Tools
                  </h3>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                    {DEFAULT_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addBlock(item.id as BlockType)}
                          className="flex w-full cursor-pointer items-center gap-2 border border-transparent px-2 py-1.5 text-left text-[11px] transition-all hover:border-border hover:bg-card"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section className="mt-auto shrink-0 border-t border-border/40 pt-4">
                  <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                    <Cpu className="h-3.5 w-3.5" /> Stats
                  </h3>
                  <div className="space-y-2 border-2 border-border bg-black/5 p-3">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-muted-foreground">Blocks (body)</span>
                      <span className="font-mono font-bold text-primary">
                        {primarySectionBlocks.length}/{MAX_BLOCKS_PER_SECTION}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-border">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (primarySectionBlocks.length / MAX_BLOCKS_PER_SECTION) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between gap-2 text-[9px]">
                      <span className="text-muted-foreground">Words (workspace)</span>
                      <span className="shrink-0 font-mono font-bold text-primary">{totalWords.toLocaleString()}</span>
                    </div>
                    <p className="text-[8px] leading-snug text-muted-foreground">
                      Title, summary, and every block (paragraphs, headings, code, tables, captions, …).
                    </p>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="left-icons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center py-3 gap-1 w-14 min-h-0 flex-1"
              >
                <div className="flex-1 overflow-y-auto flex flex-col items-center gap-0.5 min-h-0 pt-1">
                  {DEFAULT_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addBlock(item.id as BlockType)}
                        title={item.label}
                        className="p-2 border border-transparent hover:border-border hover:bg-card text-muted-foreground hover:text-primary transition-all shrink-0"
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
                <div className="shrink-0 mt-2 pt-2 border-t border-border/50 w-full flex flex-col items-center gap-1.5">
                  <div className="relative w-9 h-9">
                    <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                      <circle
                        cx="18" cy="18" r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${Math.min(primarySectionBlocks.length / MAX_BLOCKS_PER_SECTION, 1) * 88} 88`}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-300"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                      {primarySectionBlocks.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-center text-[8px] text-muted-foreground">
                    <div className="font-semibold text-foreground">{totalWords.toLocaleString()}</div>
                    <div>words</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* CENTRE: expands to fill space */}
        <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 ss-center-scroll">
          <div className={cn('mx-auto transition-[max-width] duration-300', centreMaxWidthClass)}>
             <div className="mb-8">
               <div className="relative mb-8">
                 <span className="absolute -top-3 -left-3 bg-primary text-primary-foreground text-[8px] font-bold px-1 z-10 border border-black">H1</span>
                 <div className="flex items-center justify-end text-[10px] font-bold text-muted-foreground mb-0.5">
                   <span>{title.length}/{TITLE_MAX}</span>
                 </div>
                 <textarea
                  ref={titleInputRef}
                  value={title}
                  onFocus={() => {
                    setFocusChrome('title');
                    setActiveBodyBlock(null);
                  }}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, TITLE_MAX).replaceAll(/\s+/g, ' ');
                    setTitle(next);
                    resizeTitleInput();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const raw = e.clipboardData.getData('text/plain') ?? '';
                    const plain = raw.replaceAll(/\s+/g, ' ').trim();
                    const ta = titleInputRef.current;
                    if (!ta) return;
                    const start = ta.selectionStart ?? 0;
                    const end = ta.selectionEnd ?? start;
                    const before = title.slice(0, start);
                    const after = title.slice(end);
                    const maxInsert = TITLE_MAX - before.length - after.length;
                    const toInsert = plain.slice(0, Math.max(0, maxInsert));
                    const newTitle = (before + toInsert + after).replaceAll(/\s+/g, ' ').slice(0, TITLE_MAX);
                    setTitle(newTitle);
                    requestAnimationFrame(() => {
                      resizeTitleInput();
                      const newPos = Math.min(before.length + toInsert.length, newTitle.length);
                      ta.setSelectionRange(newPos, newPos);
                    });
                  }}
                  placeholder="INPUT_TITLE_HERE..."
                  className="w-full min-h-[3rem] overflow-hidden bg-transparent border-b-2 border-border text-4xl md:text-5xl font-black uppercase tracking-tighter focus:outline-none focus:border-primary placeholder:text-muted-foreground py-4 resize-none"
                  rows={1}
                 />
               </div>
               <SummaryEditor
                 value={summary}
                 onChange={setSummary}
                 maxWords={SUMMARY_MAX_WORDS}
                 onFocusCapture={() => {
                   setFocusChrome('summary');
                   setActiveBodyBlock(null);
                 }}
               />
             </div>

             <BlogWriteEditor
               blocks={blocks}
               onBlocksChange={setBlocks}
               token={token ?? null}
               currentUserUsername={user?.username}
               currentUserHasGithub={user?.isGitAccount}
               isSidebarOpen={isOpen}
               maxWidthClassName="max-w-full"
               activeSectionId={PRIMARY_SECTION_ID}
               onActiveBlockChange={handleBodyActiveBlock}
             />
          </div>
        </div>
        </div>

        {/* RIGHT SIDEBAR: animated width, icon strip when collapsed */}
        <motion.div
          initial={false}
          animate={{ width: rightSidebarOpen ? 300 : 56 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-l-2 border-border bg-card',
            'hidden lg:flex',
          )}
        >
          <AnimatePresence mode="wait">
            {rightSidebarOpen ? (
              <motion.div
                key="right-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex h-full min-h-0 w-[300px] flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain p-6 [scrollbar-width:thin]"
              >
                <div className="shrink-0 space-y-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Publish_Control
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={openDeployOverlay}
                      disabled={submitting || !title.trim()}
                      className="group relative bg-primary text-primary-foreground border-2 border-black p-3 font-black uppercase text-xs shadow active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Send className="h-4 w-4" /> {submitAction === 'published' ? 'Deploying...' : 'Deploy_Post'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveDraft()}
                      disabled={submitting || saveDisabledNoEdits}
                      className="bg-muted border-2 border-border p-3 font-black uppercase text-xs shadow active:shadow-none active:translate-x-1 active:translate-y-1 transition-all hover:bg-card disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Save className="h-4 w-4" /> {submitAction === 'draft' ? 'Saving...' : 'Save_Draft'}
                      </div>
                    </button>
                  </div>
                </div>
                <div className="mb-6 shrink-0 space-y-4 border-t border-border/40 pt-6">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <Globe className="h-4 w-4 text-primary" /> Asset_Configuration
                  </h3>
                  <div>

                    {thumbnailPreviewUrl ? (
                      <div
                        className={cn(
                          'group/thumb relative overflow-hidden bg-muted border-2 border-dashed border-neutral-300 dark:border-neutral-600',
                          BLOG_POST_THUMBNAIL_ASPECT_CLASS,
                        )}
                      >
                        <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/thumb:opacity-100 md:group-focus-within/thumb:opacity-100">
                          <button
                            type="button"
                            onClick={() => setThumbnailDialogOpen(true)}
                            aria-label="Change thumbnail"
                            className={cn(
                              'pointer-events-auto inline-flex h-10 w-10 items-center justify-center border-2 border-border bg-card text-foreground shadow',
                              'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            )}
                          >
                            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={clearThumbnail}
                            aria-label="Remove thumbnail"
                            className={cn(
                              'pointer-events-auto inline-flex h-10 w-10 items-center justify-center border-2 border-destructive/40 bg-destructive/15 text-destructive shadow',
                              'transition-colors hover:bg-destructive/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive',
                            )}
                          >
                            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id="write-blog-thumbnail-trigger"
                        onClick={() => setThumbnailDialogOpen(true)}
                        className={cn(
                          'w-full flex flex-col items-center justify-center gap-2 cursor-pointer shadow  border border-dashed border-border ',
                          'hover:bg-muted/35 transition-colors text-left',
                          BLOG_POST_THUMBNAIL_ASPECT_CLASS,
                        )}
                      >
                        <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Upload thumbnail</span>
                        <span className="text-[9px] text-muted-foreground">JPEG, PNG, GIF, WebP · max {THUMB_MAX_MB}MB</span>
                      </button>
                    )}
                  </div>
                </div>
                <div
                  ref={revisionHistorySectionRef}
                  className="mt-auto flex min-h-0 flex-1 flex-col border-t border-border/50 pt-6 scroll-mt-6"
                >
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-foreground">
                      <History className="h-3.5 w-3.5 shrink-0 text-primary" /> Revision history
                    </h4>
                    {revisions.length > 0 ? (
                      <span className="shrink-0 font-mono text-[8px] text-muted-foreground">{revisions.length}</span>
                    ) : null}
                  </div>
                  <ul className="min-h-0 max-h-[min(42vh,15rem)] flex-1 space-y-2.5 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1 [scrollbar-width:thin]">
                    {revisions.slice(0, REVISIONS_SIDEBAR_VISIBLE).map((r) => (
                      <li
                        key={r.id}
                        className="flex gap-2 border-l-2 border-primary/50 pl-2.5 text-[9px] leading-snug"
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0  border px-1 py-0.5 text-[7px] font-black uppercase tracking-wider',
                            revisionKindBadgeClass(r.kind),
                          )}
                        >
                          {r.kind.replaceAll('_', ' ')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground">{r.label}</div>
                          <div className="mt-0.5 font-mono text-[8px] text-muted-foreground">{formatRevisionWhen(r.at)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {revisions.length > REVISIONS_SIDEBAR_VISIBLE ? (
                    <button
                      type="button"
                      onClick={() => setRevisionHistoryOpen(true)}
                      className="mt-3 flex w-full shrink-0 items-center justify-center gap-2 border-2 border-border bg-muted/30 px-2 py-2 text-[9px] font-black uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                    >
                      <ListTree className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      View all ({revisions.length})
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="right-icons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center py-3 gap-1 w-14"
              >
                <button
                  type="button"
                  onClick={openDeployOverlay}
                  disabled={submitting || !title.trim()}
                  title="Deploy post"
                  className="p-2 border border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveDraft()}
                  disabled={submitting || saveDisabledNoEdits}
                  title="Save draft"
                  className="p-2 border border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailDialogOpen(true)}
                  title="Thumbnail"
                  className="p-2 border border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-primary transition-all"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <div className="mt-2 pt-2 border-t border-border/50">
                  <span className="text-muted-foreground" title="Revision history">
                    <History className="h-4 w-4" />
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <ImageUploadCropDialog
        open={thumbnailDialogOpen}
        onClose={() => setThumbnailDialogOpen(false)}
        titleId="thumbnail-crop-title"
        title="Upload thumbnail"
        titleIcon={<ImageIcon className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />}
        subtitle={`16∶10 · Same frame as feed cards · JPEG, PNG, GIF or WebP · max ${THUMB_MAX_MB} MB · uploads when you publish`}
        subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
        maxSizeBytes={THUMB_MAX_MB * 1024 * 1024}
        aspect={BLOG_POST_THUMBNAIL_ASPECT}
        cropMinHeightClass="min-h-[15rem] h-56"
        secondaryDropzoneHint="Crop matches blog card thumbnail — 16∶10 frame"
        confirmLabel="Use thumbnail"
        chooseAnotherLabel="Choose another"
        onConfirm={handleThumbnailConfirm}
      />

      <BlogWriteDeployOverlay
        open={deployOverlayOpen}
        onClose={() => !submitting && setDeployOverlayOpen(false)}
        snapshot={publishDialogSnapshot}
        taxonomyCategories={taxonomyCategories}
        taxonomyTags={taxonomyTags}
        mySquads={mySquadsForPublish}
        initialSquadMongoId={deployOverlayInitialSquadId}
        title={title}
        summaryHtml={summary}
        thumbnailPreviewUrl={thumbnailPreviewUrl}
        deploying={submitting && submitAction === 'published'}
        savingClassification={submitting && submitAction === 'metadata'}
        onSaveClassification={(t, squadId) => {
          squadMongoIdRef.current = squadId;
          void handleSavePostDetailsFromDialog(t);
        }}
        onDeploy={(t, squadId) => void executePublish(t, squadId)}
      />

      <Dialog
        open={revisionHistoryOpen}
        onClose={() => setRevisionHistoryOpen(false)}
        titleId="revision-history-all-title"
        panelClassName={cn(
          'pointer-events-auto flex h-[min(90vh,560px)] max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden',
          'border-2 border-border bg-card shadow',
        )}
        contentClassName="relative flex h-full min-h-0 flex-1 flex-col p-0"
      >
        <div className="shrink-0 border-b-2 border-border px-5 py-4 sm:px-6">
          <h2 id="revision-history-all-title" className="text-sm font-black uppercase tracking-widest">
            All revision history
          </h2>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {revisions.length} {revisions.length === 1 ? 'entry' : 'entries'} · newest first
          </p>
        </div>
        <div
          ref={revisionDialogScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 py-4 sm:px-6 [scrollbar-width:thin]"
        >
          <ul className="space-y-3">
            {revisions.map((r) => (
              <li
                key={r.id}
                className="flex gap-2 border-l-2 border-primary/50 pl-2.5 text-[10px] leading-snug"
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0  border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider',
                    revisionKindBadgeClass(r.kind),
                  )}
                >
                  {r.kind.replaceAll('_', ' ')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{r.label}</div>
                  <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{formatRevisionWhen(r.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 border-t-2 border-border bg-muted/15 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setRevisionHistoryOpen(false)}
            className="w-full border-2 border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-wide hover:bg-muted/50"
          >
            Close
          </button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={leaveConfirmOpen}
        onClose={handleLeaveConfirmNo}
        title="Leave this page?"
        message="Save your draft to the server before leaving? Unsaved changes may be lost if you skip saving."
        confirmLabel="Yes, save draft"
        cancelLabel="No"
        variant="default"
        defaultFocusConfirm={true}
        onConfirm={handleLeaveConfirmYes}
      />
    </div>
  );
}


