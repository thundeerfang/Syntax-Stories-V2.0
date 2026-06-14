import type {
  AcceptPolicyKind,
  LegalPolicyKind,
} from "../../variable/constants.js";
export type { AcceptPolicyKind, LegalPolicyKind };
export interface PublishedPolicyResponse {
  ok: true;
  kind: LegalPolicyKind;
  slug: string;
  version: number;
  revisionId: string;
  title: string;
  summary: string;
  body: string;
  bodyFormat: "markdown" | "mdx" | "richtext";
  publishedAt: string | null;
  effectiveAt: string | null;
  region: string;
  locale: string;
  isMajor: boolean;
  contactEmail?: string;
  companyName?: string;
  contentHash?: string;
}
export interface LegalNotFoundResponse {
  ok: false;
  code: "LEGAL_NOT_FOUND";
  message: string;
}
export interface LegalConsentSlice {
  acceptedVersion: number;
  requiredVersion: number;
  mustReaccept: boolean;
}
export interface LegalMeStatusResponse {
  ok: true;
  terms: LegalConsentSlice;
  privacy: LegalConsentSlice;
}
export interface PostAcceptIntentBody {
  policyKind: AcceptPolicyKind;
  revisionId: string;
}
export interface PostAcceptIntentResponse {
  ok: true;
  nonce: string;
  expiresAt: string;
  revisionId: string;
}
export interface PostAcceptBody {
  policyKind: AcceptPolicyKind;
  version: number;
  revisionId: string;
  nonce: string;
  contentHash?: string;
}
export interface PostAcceptResponse {
  ok: true;
  accepted: true;
  userId: string;
  policyKind: AcceptPolicyKind;
  version: number;
  revisionId: string;
  acceptedAt: string;
}
export interface PostDataDeletionRequestBody {
  message?: string;
}
export interface PostDataDeletionRequestResponse {
  ok: true;
  id: string;
  status: "requested";
  requestedAt: string;
}
