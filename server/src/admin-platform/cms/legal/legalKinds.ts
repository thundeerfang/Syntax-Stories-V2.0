import { z } from "zod";
import {
  LEGAL_POLICY_KINDS,
  type AcceptPolicyKind,
  type LegalPolicyKind,
} from "../../../variable/constants.js";
export const LEGAL_KINDS = LEGAL_POLICY_KINDS;
export type LegalKind = LegalPolicyKind;
export { ACCEPT_POLICY_KINDS } from "../../../variable/constants.js";
export const KIND_TO_SLUG: Record<LegalKind, string> = {
  terms: "terms-of-service",
  privacy: "privacy-policy",
  udd: "user-data-deletion",
};
export function slugForKind(kind: LegalKind): string {
  return KIND_TO_SLUG[kind];
}
export function kindFromSlug(slug: string): LegalKind | null {
  const e = Object.entries(KIND_TO_SLUG).find(([, s]) => s === slug);
  return e ? (e[0] as LegalKind) : null;
}
export const legalKindParamSchema = z.enum(LEGAL_KINDS);
export type { AcceptPolicyKind };
