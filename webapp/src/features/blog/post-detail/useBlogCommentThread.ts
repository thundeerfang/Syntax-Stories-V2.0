import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { blogApi } from "@/api/blog";
import type { PublicBlogComment } from "@/types/blog";

export const COMMENT_PAGE_SIZE = 10;

export type ThreadSort = "oldest" | "newest";

type ReplyBranchState = {
  expanded: boolean;
  childIds: string[];
  offset: number;
  hasMore: boolean;
  loading: boolean;
};

function mergeById(
  prev: Map<string, PublicBlogComment>,
  list: PublicBlogComment[],
): Map<string, PublicBlogComment> {
  const next = new Map(prev);
  for (const c of list) next.set(c._id, c);
  return next;
}

function appendUniqueIds(prev: string[], ids: string[]): string[] {
  const seen = new Set(prev);
  const out = [...prev];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function useBlogCommentThread({
  username,
  slug,
  token,
  threadSort,
}: {
  username: string;
  slug: string;
  token: string | null;
  threadSort: ThreadSort;
}) {
  const [byId, setById] = useState<Map<string, PublicBlogComment>>(new Map());
  const [rootIds, setRootIds] = useState<string[]>([]);
  const [rootOffset, setRootOffset] = useState(0);
  const [rootHasMore, setRootHasMore] = useState(false);
  const [rootTotal, setRootTotal] = useState(0);
  const [postTotal, setPostTotal] = useState(0);
  const [rootsLoading, setRootsLoading] = useState(true);
  const [rootsLoadingMore, setRootsLoadingMore] = useState(false);
  const [branches, setBranches] = useState<Map<string, ReplyBranchState>>(
    new Map(),
  );
  const loadRootsRef = useRef(0);
  const rootOffsetRef = useRef(0);

  useEffect(() => {
    rootOffsetRef.current = rootOffset;
  }, [rootOffset]);

  const resetThread = useCallback(() => {
    setById(new Map());
    setRootIds([]);
    setRootOffset(0);
    setRootHasMore(false);
    setRootTotal(0);
    setBranches(new Map());
  }, []);

  const applyRootPage = useCallback(
    (
      list: PublicBlogComment[],
      total: number,
      nextPostTotal: number,
      offset: number,
      hasMore: boolean,
      replace: boolean,
    ) => {
      setById((prev) => mergeById(prev, list));
      setRootIds((prev) =>
        replace
          ? list.map((c) => c._id)
          : appendUniqueIds(prev, list.map((c) => c._id)),
      );
      setRootOffset(offset + list.length);
      setRootHasMore(hasMore);
      setRootTotal(total);
      setPostTotal(nextPostTotal);
    },
    [],
  );

  const loadRoots = useCallback(
    async (replace = true) => {
      const seq = ++loadRootsRef.current;
      if (replace) {
        setRootsLoading(true);
        resetThread();
      } else {
        setRootsLoadingMore(true);
      }
      try {
        const page = await blogApi.getComments(username, slug, {
          limit: COMMENT_PAGE_SIZE,
          offset: replace ? 0 : rootOffsetRef.current,
          sort: threadSort,
          accessToken: token,
        });
        if (seq !== loadRootsRef.current) return;
        applyRootPage(
          page.comments,
          page.total,
          page.postTotal,
          page.offset,
          page.hasMore,
          replace,
        );
      } catch {
        if (seq === loadRootsRef.current && replace) {
          applyRootPage([], 0, 0, 0, false, true);
        }
      } finally {
        if (seq === loadRootsRef.current) {
          setRootsLoading(false);
          setRootsLoadingMore(false);
        }
      }
    },
    [applyRootPage, resetThread, slug, threadSort, token, username],
  );

  useEffect(() => {
    void loadRoots(true);
  }, [username, slug, token, threadSort]);

  const loadMoreRoots = useCallback(async () => {
    if (rootsLoading || rootsLoadingMore || !rootHasMore) return;
    await loadRoots(false);
  }, [loadRoots, rootHasMore, rootsLoading, rootsLoadingMore]);

  const fetchReplyPage = useCallback(
    async (parentId: string, offset: number) => {
      return blogApi.getComments(username, slug, {
        parentId,
        limit: COMMENT_PAGE_SIZE,
        offset,
        accessToken: token,
      });
    },
    [slug, token, username],
  );

  const ensureRepliesLoaded = useCallback(
    async (parentId: string, expand: boolean) => {
      const branch = branches.get(parentId);
      if (expand && branch && branch.childIds.length > 0) {
        setBranches((prev) => {
          const next = new Map(prev);
          const cur = next.get(parentId);
          if (!cur) return prev;
          next.set(parentId, { ...cur, expanded: true });
          return next;
        });
        return;
      }
      if (branch?.expanded && branch.childIds.length > 0 && expand) return;
      setBranches((prev) => {
        const next = new Map(prev);
        const cur = next.get(parentId);
        next.set(parentId, {
          expanded: expand || cur?.expanded === true,
          childIds: cur?.childIds ?? [],
          offset: cur?.offset ?? 0,
          hasMore: cur?.hasMore ?? false,
          loading: true,
        });
        return next;
      });
      try {
        const page = await fetchReplyPage(parentId, branch?.offset ?? 0);
        setById((prev) => mergeById(prev, page.comments));
        setBranches((prev) => {
          const next = new Map(prev);
          const cur = next.get(parentId);
          const childIds = appendUniqueIds(
            cur?.childIds ?? [],
            page.comments.map((c) => c._id),
          );
          next.set(parentId, {
            expanded: expand || cur?.expanded === true,
            childIds,
            offset: page.offset + page.comments.length,
            hasMore: page.hasMore,
            loading: false,
          });
          return next;
        });
      } catch {
        setBranches((prev) => {
          const next = new Map(prev);
          const cur = next.get(parentId);
          if (!cur) return prev;
          next.set(parentId, { ...cur, loading: false });
          return next;
        });
        throw new Error("Failed to load replies");
      }
    },
    [branches, fetchReplyPage],
  );

  const toggleReplies = useCallback(
    async (parentId: string) => {
      const branch = branches.get(parentId);
      if (branch?.expanded) {
        setBranches((prev) => {
          const next = new Map(prev);
          const cur = next.get(parentId);
          if (!cur) return prev;
          next.set(parentId, { ...cur, expanded: false });
          return next;
        });
        return;
      }
      await ensureRepliesLoaded(parentId, true);
    },
    [branches, ensureRepliesLoaded],
  );

  const loadMoreReplies = useCallback(
    async (parentId: string) => {
      const branch = branches.get(parentId);
      if (!branch || branch.loading || !branch.hasMore) return;
      setBranches((prev) => {
        const next = new Map(prev);
        const cur = next.get(parentId);
        if (!cur) return prev;
        next.set(parentId, { ...cur, loading: true });
        return next;
      });
      try {
        const page = await fetchReplyPage(parentId, branch.offset);
        setById((prev) => mergeById(prev, page.comments));
        setBranches((prev) => {
          const next = new Map(prev);
          const cur = next.get(parentId);
          if (!cur) return prev;
          next.set(parentId, {
            ...cur,
            childIds: appendUniqueIds(
              cur.childIds,
              page.comments.map((c) => c._id),
            ),
            offset: page.offset + page.comments.length,
            hasMore: page.hasMore,
            loading: false,
          });
          return next;
        });
      } catch {
        setBranches((prev) => {
          const next = new Map(prev);
          const cur = next.get(parentId);
          if (!cur) return prev;
          next.set(parentId, { ...cur, loading: false });
          return next;
        });
      }
    },
    [branches, fetchReplyPage],
  );

  const expandAncestors = useCallback(
    async (commentId: string) => {
      let current = byId.get(commentId);
      const chain: string[] = [];
      while (current?.parentId) {
        chain.unshift(current.parentId);
        current = byId.get(current.parentId);
      }
      for (const parentId of chain) {
        await ensureRepliesLoaded(parentId, true);
      }
    },
    [byId, ensureRepliesLoaded],
  );

  const upsertComment = useCallback((comment: PublicBlogComment) => {
    setById((prev) => mergeById(prev, [comment]));
  }, []);

  const onCommentPosted = useCallback(
    async (comment: PublicBlogComment) => {
      upsertComment(comment);
      setPostTotal((t) => t + 1);
      if (!comment.parentId) {
        setRootIds((prev) =>
          threadSort === "newest"
            ? [comment._id, ...prev]
            : [...prev, comment._id],
        );
        setRootTotal((t) => t + 1);
        return;
      }
      const parentId = comment.parentId;
      setById((prev) => {
        const parent = prev.get(parentId);
        if (!parent) return prev;
        const next = new Map(prev);
        next.set(parentId, {
          ...parent,
          directReplyCount: (parent.directReplyCount ?? 0) + 1,
        });
        return next;
      });
      const branch = branches.get(parentId);
      if (branch?.expanded) {
        setBranches((prev) => {
          const next = new Map(prev);
          const cur = next.get(parentId);
          if (!cur) return prev;
          next.set(parentId, {
            ...cur,
            childIds: appendUniqueIds(cur.childIds, [comment._id]),
          });
          return next;
        });
      } else {
        await ensureRepliesLoaded(parentId, true);
        setBranches((prev) => {
          const next = new Map(prev);
          const cur = next.get(parentId);
          if (!cur) return prev;
          next.set(parentId, {
            ...cur,
            childIds: appendUniqueIds(cur.childIds, [comment._id]),
          });
          return next;
        });
      }
    },
    [branches, ensureRepliesLoaded, threadSort, upsertComment],
  );

  const patchCommentInState = useCallback((comment: PublicBlogComment) => {
    upsertComment(comment);
  }, [upsertComment]);

  const patchCommentLike = useCallback(
    (commentId: string, likeCount: number, likedByViewer: boolean) => {
      setById((prev) => {
        const cur = prev.get(commentId);
        if (!cur) return prev;
        const next = new Map(prev);
        next.set(commentId, { ...cur, likeCount, likedByViewer });
        return next;
      });
    },
    [],
  );

  const optimisticLike = useCallback(
    (comment: PublicBlogComment) => {
      const was = comment.likedByViewer === true;
      const prevCount = comment.likeCount;
      patchCommentLike(
        comment._id,
        Math.max(0, prevCount + (was ? -1 : 1)),
        !was,
      );
      return { was, prevCount };
    },
    [patchCommentLike],
  );

  const comments = useMemo(() => Array.from(byId.values()), [byId]);

  return {
    byId,
    comments,
    rootIds,
    rootTotal,
    postTotal,
    rootsLoading,
    rootsLoadingMore,
    rootHasMore,
    branches,
    loadRoots,
    loadMoreRoots,
    toggleReplies,
    loadMoreReplies,
    expandAncestors,
    onCommentPosted,
    patchCommentInState,
    patchCommentLike,
    optimisticLike,
  };
}
