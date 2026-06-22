"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, DIALOG_Z_INDEX_STACKED } from "@/components/ui";
import {
  fetchLegalMeStatus,
  fetchPublishedPolicy,
  postLegalAccept,
  postLegalAcceptIntent,
  type AcceptPolicyKind,
  type LegalMeStatusResponse,
  type PublishedPolicyResponse,
} from "@/api/legal";
import { cn } from "@/lib/core/utils";
import { useAuthStore } from "@/store/auth";
import { useLegalReconsentStore } from "@/store/legalReconsent";

const LEGAL_RECONSENT_CODE = "LEGAL_RECONSENT_REQUIRED";

type PolicyMap = Partial<Record<AcceptPolicyKind, PublishedPolicyResponse>>;
type AcceptedMap = Record<AcceptPolicyKind, boolean>;

function idempotencyKey(kind: AcceptPolicyKind, revisionId: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `legal-reconsent-${kind}-${revisionId}-${random}`;
}

function requiredKinds(status: LegalMeStatusResponse | null): AcceptPolicyKind[] {
  if (!status) return [];
  return (["terms", "privacy"] as const).filter((kind) => status[kind].mustReaccept);
}

function policyLabel(kind: AcceptPolicyKind): string {
  return kind === "terms" ? "Terms of Service" : "Privacy Policy";
}

export function LegalReconsentGate() {
  const token = useAuthStore((s) => s.token);
  const open = useLegalReconsentStore((s) => s.open);
  const triggerCount = useLegalReconsentStore((s) => s.triggerCount);
  const openDialog = useLegalReconsentStore((s) => s.openDialog);
  const closeDialog = useLegalReconsentStore((s) => s.closeDialog);
  const [status, setStatus] = useState<LegalMeStatusResponse | null>(null);
  const [policies, setPolicies] = useState<PolicyMap>({});
  const [accepted, setAccepted] = useState<AcceptedMap>({
    terms: false,
    privacy: false,
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 403) {
        void response
          .clone()
          .json()
          .then((body: { code?: string }) => {
            if (body?.code === LEGAL_RECONSENT_CODE) openDialog();
          })
          .catch(() => undefined);
      }
      return response;
    };
    return () => {
      globalThis.fetch = originalFetch;
    };
  }, [openDialog]);

  const loadStatus = useCallback(
    async (mode: "silent" | "dialog") => {
      if (!token) {
        closeDialog();
        setStatus(null);
        setPolicies({});
        return;
      }
      if (mode === "dialog") setLoading(true);
      setError(null);
      try {
        const nextStatus = await fetchLegalMeStatus(token);
        setStatus(nextStatus);
        const needed = requiredKinds(nextStatus);
        if (needed.length === 0) {
          closeDialog();
          return;
        }
        const loadedPolicies = await Promise.all(
          needed.map(async (kind) => [kind, await fetchPublishedPolicy(kind)] as const),
        );
        setPolicies((prev) => ({
          ...prev,
          ...Object.fromEntries(loadedPolicies),
        }));
        if (mode === "silent") openDialog();
      } catch (e) {
        if (mode === "dialog") {
          setError(e instanceof Error ? e.message : "Could not load legal documents.");
        }
      } finally {
        if (mode === "dialog") setLoading(false);
      }
    },
    [closeDialog, openDialog, token],
  );

  useEffect(() => {
    if (!token) return;
    void loadStatus("silent");
  }, [token, loadStatus]);

  useEffect(() => {
    if (!open) return;
    setAccepted({ terms: false, privacy: false });
    void loadStatus("dialog");
  }, [open, triggerCount, loadStatus]);

  const needed = useMemo(() => requiredKinds(status), [status]);
  const canSubmit =
    needed.length > 0 && needed.every((kind) => accepted[kind] && policies[kind]);

  const handleAccept = async () => {
    if (!token || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      for (const kind of needed) {
        const policy = policies[kind];
        if (!policy) throw new Error(`${policyLabel(kind)} is not available.`);
        const intent = await postLegalAcceptIntent(token, {
          policyKind: kind,
          revisionId: policy.revisionId,
        });
        await postLegalAccept(
          token,
          {
            policyKind: kind,
            version: policy.version,
            revisionId: policy.revisionId,
            nonce: intent.nonce,
            contentHash: policy.contentHash,
          },
          idempotencyKey(kind, policy.revisionId),
        );
      }
      toast.success("Legal agreements accepted. You can continue now.");
      closeDialog();
      setStatus(null);
      setPolicies({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept legal documents.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open && !!token}
      onClose={() => undefined}
      title="Accept Required Policies"
      titleIcon={<ShieldCheck />}
      description="Please accept the latest Terms and Privacy Policy before continuing."
      showCloseButton={false}
      closeOnBackdropClick={false}
      closeOnEscape={false}
      zIndex={DIALOG_Z_INDEX_STACKED}
      panelClassName="max-w-xl"
      contentClassName="relative flex min-h-0 flex-col gap-4 p-5 sm:p-6"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
          Loading current policies…
        </div>
      ) : (
        <>
          <div className="border-2 border-border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
            Older accounts must accept the current legal documents once. Your
            previous action was blocked until this is complete.
          </div>

          {error ? (
            <div className="flex gap-2 border-2 border-destructive/60 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="space-y-3">
            {needed.map((kind) => {
              const policy = policies[kind];
              const href = kind === "terms" ? "/terms" : "/privacy";
              const inputId = `legal-reconsent-${kind}`;
              return (
                <label
                  key={kind}
                  htmlFor={inputId}
                  className={cn(
                    "block cursor-pointer border-2 border-border bg-card p-3 shadow-sm transition-colors",
                    accepted[kind] && "border-primary bg-primary/5",
                  )}
                >
                  <span className="flex items-start gap-3">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={accepted[kind]}
                      onChange={(e) =>
                        setAccepted((prev) => ({ ...prev, [kind]: e.target.checked }))
                      }
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
                        <FileText className="size-4 text-primary" aria-hidden />
                        {policyLabel(kind)}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {policy?.summary || "Review the current published document."}
                      </span>
                      <Link
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-bold text-primary underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open {policyLabel(kind)} in a new tab
                      </Link>
                    </span>
                    {policy ? (
                      <span className="shrink-0 border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-muted-foreground">
                        v{policy.version}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t-2 border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">
              After accepting, repeat the action you were trying to perform.
            </p>
            <Button
              type="button"
              loading={submitting}
              disabled={!canSubmit || submitting}
              onClick={() => void handleAccept()}
              className="font-mono text-[10px] font-black uppercase tracking-widest"
            >
              Accept and continue
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
