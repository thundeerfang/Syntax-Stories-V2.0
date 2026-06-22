import { resolveSameOriginRequestUrl } from "@/lib/api/publicApiBase";
import type * as LegalApi from "@contracts/legalApi";
function legalBase(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/api/v1/legal` : "/api/v1/legal";
}
export async function fetchPublishedPolicy(
  kind: LegalApi.LegalPolicyKind,
): Promise<LegalApi.PublishedPolicyResponse> {
  const url = resolveSameOriginRequestUrl(`${legalBase()}/policies/${kind}`);
  const res = await fetch(url, { credentials: "include" });
  const data = (await res.json()) as LegalApi.PublishedPolicyResponse;
  if (!res.ok)
    throw new Error(
      (
        data as {
          message?: string;
        }
      ).message ?? res.statusText,
    );
  return data;
}
export async function fetchLegalMeStatus(
  accessToken: string,
): Promise<LegalApi.LegalMeStatusResponse> {
  const url = resolveSameOriginRequestUrl(`${legalBase()}/me/status`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  const data = (await res.json()) as LegalApi.LegalMeStatusResponse;
  if (!res.ok)
    throw new Error(
      (
        data as {
          message?: string;
        }
      ).message ?? res.statusText,
    );
  return data;
}
export async function postLegalAcceptIntent(
  accessToken: string,
  body: LegalApi.PostAcceptIntentBody,
): Promise<LegalApi.PostAcceptIntentResponse> {
  const url = resolveSameOriginRequestUrl(`${legalBase()}/accept-intent`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as LegalApi.PostAcceptIntentResponse;
  if (!res.ok)
    throw new Error(
      (
        data as {
          message?: string;
        }
      ).message ?? res.statusText,
    );
  return data;
}
export async function postLegalAccept(
  accessToken: string,
  body: LegalApi.PostAcceptBody,
  idempotencyKey?: string,
): Promise<LegalApi.PostAcceptResponse> {
  const url = resolveSameOriginRequestUrl(`${legalBase()}/accept`);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as LegalApi.PostAcceptResponse;
  if (!res.ok)
    throw new Error(
      (
        data as {
          message?: string;
        }
      ).message ?? res.statusText,
    );
  return data;
}
export async function postDataDeletionRequest(
  accessToken: string,
  body: LegalApi.PostDataDeletionRequestBody = {},
  idempotencyKey?: string,
): Promise<LegalApi.PostDataDeletionRequestResponse> {
  const url = resolveSameOriginRequestUrl(
    `${legalBase()}/data-deletion-requests`,
  );
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as LegalApi.PostDataDeletionRequestResponse & {
    code?: string;
    message?: string;
    retryAfterSec?: number;
  };
  if (!res.ok) {
    const parts = [data.code, data.message].filter(Boolean);
    const msg = parts.length ? parts.join(": ") : res.statusText;
    if (data.retryAfterSec != null) {
      throw new Error(`${msg} (retry after ${data.retryAfterSec}s)`);
    }
    throw new Error(msg);
  }
  return data;
}
export async function listDataDeletionRequests(
  accessToken: string,
): Promise<LegalApi.ListDataDeletionRequestsResponse> {
  const url = resolveSameOriginRequestUrl(
    `${legalBase()}/data-deletion-requests`,
  );
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  const data = (await res.json()) as LegalApi.ListDataDeletionRequestsResponse & {
    message?: string;
  };
  if (!res.ok) throw new Error(data.message ?? res.statusText);
  return data;
}
export async function cancelDataDeletionRequest(
  accessToken: string,
  requestId: string,
): Promise<LegalApi.CancelDataDeletionRequestResponse> {
  const url = resolveSameOriginRequestUrl(
    `${legalBase()}/data-deletion-requests/${requestId}/cancel`,
  );
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  const data = (await res.json()) as LegalApi.CancelDataDeletionRequestResponse & {
    code?: string;
    message?: string;
  };
  if (!res.ok) {
    const parts = [data.code, data.message].filter(Boolean);
    throw new Error(parts.length ? parts.join(": ") : res.statusText);
  }
  return data;
}
export type {
  LegalPolicyKind,
  AcceptPolicyKind,
  PublishedPolicyResponse,
  LegalMeStatusResponse,
  PostAcceptIntentBody,
  PostAcceptIntentResponse,
  PostAcceptBody,
  PostAcceptResponse,
  PostDataDeletionRequestBody,
  PostDataDeletionRequestResponse,
  DataDeletionRequestItem,
  ListDataDeletionRequestsResponse,
  CancelDataDeletionRequestResponse,
} from "@contracts/legalApi";
