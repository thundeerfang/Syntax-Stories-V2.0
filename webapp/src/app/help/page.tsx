import Link from 'next/link';
import { publicApiAbortSignal } from '@/lib/api/publicApiFetchTimeout';


type Item = {
  slug: string;
  title: string;
  summary: string;
  canonicalPath: string;
  category?: string;
};

async function fetchList(): Promise<Item[]> {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/v1/help/articles?page=1&pageSize=50`, {
      next: { revalidate: 60 },
      signal: publicApiAbortSignal(),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Item[] };
    const rows = json.data ?? [];
    return rows.filter((a) => (a.category ?? 'general').toLowerCase() !== 'documentation');
  } catch {
    return [];
  }
}

export default async function HelpHubPage() {
  const items = await fetchList();
  return (
    <div className="mx-auto max-w-prose space-y-6 px-4 py-10">
      <h1 className="text-3xl font-black tracking-tight">Help</h1>
      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-muted-foreground">No articles yet.</li>
        ) : (
          items.map((a) => (
            <li key={a.slug}>
              <Link
                href={a.canonicalPath}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {a.title}
              </Link>
              {a.summary ? <p className="text-sm text-muted-foreground">{a.summary}</p> : null}
            </li>
          ))
        )}
      </ul>
      <p className="text-sm text-muted-foreground">
        <Link href="/help/sign-in" className="underline">
          Trouble signing in?
        </Link>
      </p>
    </div>
  );
}
