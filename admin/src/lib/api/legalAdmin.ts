import { adminAuthenticatedFetch } from '@/lib/auth/adminAuthenticatedFetch';

const LEGAL_BASE = '/api/v1/admin/legal';

export type LegalPolicyKind = 'terms' | 'privacy' | 'udd';

export type LegalPolicyStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'archived';

export type LegalPolicyRecord = {
  _id: string;
  kind: LegalPolicyKind;
  slug: string;
  title: string;
  summary: string;
  body: string;
  bodyFormat: string;
  status: LegalPolicyStatus;
  version: number;
  publishedRevisionId?: string | null;
  publishedAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

export type LegalPolicyRevision = {
  _id: string;
  revisionId: string;
  version: number;
  title: string;
  summary?: string;
  body?: string;
  status: string;
  publishedAt?: string | null;
  createdAt?: string;
  changeLog?: string;
};

export type LegalPolicyRevisionDetail = LegalPolicyRevision & {
  summary: string;
  body: string;
  bodyFormat?: string;
  changeLog?: string;
  effectiveAt?: string | null;
};

type LegalErr = { ok?: false; message?: string; code?: string };

async function parseLegalJson<T>(res: Response): Promise<T & LegalErr> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    throw new Error(
      res.ok
        ? 'Legal API returned an invalid response'
        : `Legal API error (${res.status}). Check that the API server is running and NEXT_PUBLIC_API_BASE_URL points to it.`
    );
  }
  try {
    return JSON.parse(trimmed) as T & LegalErr;
  } catch {
    throw new Error(`Legal API returned non-JSON (${res.status})`);
  }
}

function throwLegal(res: Response, json: LegalErr): never {
  if (res.status === 429) {
    throw new Error('Too many requests — wait a moment and refresh the page.');
  }
  throw new Error(json.message ?? `Legal API error (${res.status})`);
}

export async function bootstrapLegalPolicies(
  token: string | null
): Promise<LegalPolicyRecord[]> {
  const res = await adminAuthenticatedFetch(`${LEGAL_BASE}/policies/bootstrap`, {
    method: 'POST',
    token,
  });
  const json = await parseLegalJson<{ ok?: boolean; items?: LegalPolicyRecord[] }>(res);
  if (res.status === 429) {
    throw new Error('Too many requests — wait a moment and refresh the page.');
  }
  if (!res.ok || !json.ok || !json.items) throwLegal(res, json);
  return json.items;
}

export async function listLegalPolicies(
  token: string | null
): Promise<LegalPolicyRecord[]> {
  const res = await adminAuthenticatedFetch(`${LEGAL_BASE}/policies`, { token });
  const json = await parseLegalJson<{ ok?: boolean; items?: LegalPolicyRecord[] }>(res);
  if (res.status === 429) {
    throw new Error('Too many requests — wait a moment and refresh the page.');
  }
  if (!res.ok || !json.ok || !json.items) throwLegal(res, json);
  return json.items;
}

export async function getLegalPolicy(
  token: string | null,
  policyId: string
): Promise<LegalPolicyRecord> {
  const res = await adminAuthenticatedFetch(
    `${LEGAL_BASE}/policies/${encodeURIComponent(policyId)}`,
    { token }
  );
  const json = await parseLegalJson<{ ok?: boolean; policy?: LegalPolicyRecord }>(res);
  if (!res.ok || !json.ok || !json.policy) throwLegal(res, json);
  return json.policy;
}

export async function listLegalRevisions(
  token: string | null,
  policyId: string
): Promise<LegalPolicyRevision[]> {
  const res = await adminAuthenticatedFetch(
    `${LEGAL_BASE}/policies/${encodeURIComponent(policyId)}/revisions?limit=100`,
    { token }
  );
  const json = await parseLegalJson<{ ok?: boolean; items?: LegalPolicyRevision[] }>(res);
  if (res.status === 429) {
    throw new Error('Too many requests — wait a moment and refresh the page.');
  }
  if (!res.ok || !json.ok || !json.items) throwLegal(res, json);
  return json.items;
}

export type LegalPatchAction =
  | 'save_draft'
  | 'submit_review'
  | 'approve'
  | 'publish'
  | 'archive'
  | 'start_draft'
  | 'discard_draft';

export async function deleteLegalRevision(
  token: string | null,
  policyId: string,
  revisionId: string
): Promise<void> {
  const res = await adminAuthenticatedFetch(
    `${LEGAL_BASE}/policies/${encodeURIComponent(policyId)}/revisions/${encodeURIComponent(revisionId)}`,
    { method: 'DELETE', token }
  );
  const json = await parseLegalJson<{ ok?: boolean }>(res);
  if (!res.ok || !json.ok) throwLegal(res, json);
}

export async function getLegalRevision(
  token: string | null,
  policyId: string,
  revisionId: string
): Promise<LegalPolicyRevisionDetail> {
  const res = await adminAuthenticatedFetch(
    `${LEGAL_BASE}/policies/${encodeURIComponent(policyId)}/revisions/${encodeURIComponent(revisionId)}`,
    { token }
  );
  const json = await parseLegalJson<{ ok?: boolean; revision?: LegalPolicyRevisionDetail }>(res);
  if (!res.ok || !json.ok || !json.revision) throwLegal(res, json);
  return json.revision;
}

export async function ensureLegalPolicyForKind(
  token: string | null,
  kind: LegalPolicyKind,
  cached?: LegalPolicyRecord | null
): Promise<LegalPolicyRecord> {
  if (cached?._id && cached.kind === kind) {
    return getLegalPolicy(token, cached._id);
  }
  const policies = await listLegalPolicies(token);
  let row = policies.find((p) => p.kind === kind);
  if (!row) {
    const boot = await bootstrapLegalPolicies(token);
    row = boot.find((p) => p.kind === kind);
  }
  if (!row) throw new Error(`No policy found for ${kind}`);
  return getLegalPolicy(token, row._id);
}

export async function patchLegalPolicy(
  token: string | null,
  policyId: string,
  body: {
    action: LegalPatchAction;
    title?: string;
    summary?: string;
    body?: string;
    changeLog?: string;
    isMajor?: boolean;
  }
): Promise<LegalPolicyRecord> {
  const res = await adminAuthenticatedFetch(
    `${LEGAL_BASE}/policies/${encodeURIComponent(policyId)}`,
    {
      method: 'PATCH',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const json = await parseLegalJson<{ ok?: boolean; policy?: LegalPolicyRecord }>(res);
  if (!res.ok || !json.ok || !json.policy) throwLegal(res, json);
  return json.policy;
}
