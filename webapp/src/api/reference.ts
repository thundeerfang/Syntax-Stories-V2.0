function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return base ? base.replace(/\/$/, "") : "";
}
function referenceUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}/api/reference${path}` : `/api/reference${path}`;
}
export type {
  ReferenceEntityKind,
  EntityOption,
  TechStackCategory,
  TechStackItem,
} from "@contracts/referenceApi";
import type {
  EntityOption,
  ReferenceEntityKind,
  TechStackItem,
} from "@contracts/referenceApi";
export async function searchReferenceEntitiesApi(
  kind: ReferenceEntityKind,
  query: string,
  limit = 15,
): Promise<EntityOption[]> {
  const q = query?.trim() ?? "";
  const params = new URLSearchParams({ kind, limit: String(limit) });
  if (q) params.set("q", q);
  try {
    const res = await fetch(referenceUrl(`/entities?${params}`), {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success?: boolean;
      entities?: EntityOption[];
    };
    return Array.isArray(data.entities) ? data.entities : [];
  } catch {
    return [];
  }
}
export async function searchTechStackApi(
  query: string,
  limit = 15,
): Promise<TechStackItem[]> {
  const q = query?.trim() ?? "";
  if (!q || q.length < 2) return [];
  const params = new URLSearchParams({ q, limit: String(limit) });
  try {
    const res = await fetch(referenceUrl(`/tech-stack?${params}`), {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success?: boolean;
      items?: TechStackItem[];
    };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}
export async function resolveTechStackApi(
  names: string[],
): Promise<TechStackItem[]> {
  const list = names
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (list.length === 0) return [];
  try {
    const res = await fetch(referenceUrl("/tech-stack/resolve"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: list }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success?: boolean;
      items?: TechStackItem[];
    };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}
