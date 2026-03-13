function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return base.replace(/\/$/, '');
}

export interface CreatePostPayload {
  title: string;
  content: string;
  thumbnailUrl?: string;
  status?: 'draft' | 'published';
}

export interface BlogPostResponse {
  _id: string;
  title: string;
  slug: string;
  content: string;
  thumbnailUrl?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export const blogApi = {
  createPost: async (payload: CreatePostPayload, accessToken: string): Promise<{ success: boolean; post: BlogPostResponse }> => {
    const r = await fetch(`${getApiBase()}/api/blog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string; post?: BlogPostResponse };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as { success: boolean; post: BlogPostResponse };
  },

  listMyPosts: async (accessToken: string, status?: 'draft' | 'published'): Promise<{ success: boolean; posts: BlogPostResponse[] }> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const r = await fetch(`${getApiBase()}/api/blog${qs}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string; posts?: BlogPostResponse[] };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as { success: boolean; posts: BlogPostResponse[] };
  },
};
