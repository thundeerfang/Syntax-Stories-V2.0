/**
 * Company search via backend proxy to OpenCorporates (open data API).
 */

function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return base ? base.replace(/\/$/, '') : '';
}

export interface CompanyOption {
  name: string;
  domain: string;
}

export async function searchCompaniesApi(query: string): Promise<CompanyOption[]> {
  const q = query?.trim();
  if (!q || q.length < 2) return [];
  const base = getApiBase();
  const url = base
    ? `${base}/api/companies/search?q=${encodeURIComponent(q)}`
    : `/api/companies/search?q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { success?: boolean; companies?: CompanyOption[] };
    return Array.isArray(data.companies) ? data.companies : [];
  } catch {
    return [];
  }
}
