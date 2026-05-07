export type LegalJobMessage =
  | { type: 'LEGAL_POLICY_PUBLISHED'; revisionId: string; kind: string }
  | { type: 'LEGAL_RECONSENT_FANOUT'; kind: string; version: number }
  | { type: 'DATA_DELETION_PROCESS'; requestId: string };

/** In-process queue (§24); replace with BullMQ/SQS when scaling. */
export const legalJobQueue: LegalJobMessage[] = [];
