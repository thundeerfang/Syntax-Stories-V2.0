"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useAuthDialogStore } from "@/store/authDialog";
import {
  cancelDataDeletionRequest,
  listDataDeletionRequests,
  postDataDeletionRequest,
  type DataDeletionRequestItem,
} from "@/api/legal";
import { BlockShadowButton, Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  LEGAL_ACTION_BODY,
  LEGAL_ACTION_CTA_ROW,
  LEGAL_ACTION_KICKER,
  LEGAL_ACTION_PANEL,
  LEGAL_ACTION_TITLE,
  LEGAL_CARD_SECTION_RULE,
  LEGAL_MUTED_INLINE,
  LEGAL_RETRO_ICON_TILE_TOC,
} from "./legalUi";
function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "Not scheduled";
}
export function UserDataDeletionPanel() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requests, setRequests] = useState<DataDeletionRequestItem[]>([]);
  const [confirmRequestOpen, setConfirmRequestOpen] = useState(false);
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);
  const openRequest = useMemo(
    () =>
      requests.find(
        (item) => item.status === "requested" || item.status === "processing",
      ) ?? null,
    [requests],
  );
  const refreshRequests = useCallback(async () => {
    if (!token) {
      setRequests([]);
      return;
    }
    setRequestsLoading(true);
    try {
      const res = await listDataDeletionRequests(token);
      setRequests(res.items);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not load deletion requests.",
      );
    } finally {
      setRequestsLoading(false);
    }
  }, [token]);
  useEffect(() => {
    if (!isHydrated) return;
    void refreshRequests();
  }, [isHydrated, refreshRequests]);
  const onRequest = useCallback(async () => {
    if (!token) {
      openAuth("login");
      return;
    }
    setLoading(true);
    try {
      const idem = globalThis.crypto?.randomUUID?.() ?? `udd-${Date.now()}`;
      const res = await postDataDeletionRequest(token, {}, idem);
      toast.success("Deletion request submitted", {
        description: `Reference time: ${new Date(res.requestedAt).toLocaleString()}`,
      });
      await refreshRequests();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, openAuth, refreshRequests]);
  const onWithdraw = useCallback(async () => {
    if (!token || !openRequest) return;
    setLoading(true);
    try {
      await cancelDataDeletionRequest(token, openRequest.id);
      toast.success("Deletion request withdrawn");
      await refreshRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not withdraw request");
    } finally {
      setLoading(false);
    }
  }, [token, openRequest, refreshRequests]);
  if (!isHydrated) {
    return (
      <div className={LEGAL_CARD_SECTION_RULE}>
        <div className={`${LEGAL_ACTION_PANEL} flex items-center gap-3`}>
          <Loader2
            className="h-5 w-5 shrink-0 animate-spin text-primary"
            aria-hidden
          />
          <p className={LEGAL_MUTED_INLINE}>Loading account state…</p>
        </div>
      </div>
    );
  }
  return (
    <div className={LEGAL_CARD_SECTION_RULE}>
      <div className={LEGAL_ACTION_PANEL}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className={LEGAL_RETRO_ICON_TILE_TOC}>
            <ShieldAlert className="size-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className={LEGAL_ACTION_KICKER}>Your account</p>
            <h2 className={LEGAL_ACTION_TITLE}>Request data deletion</h2>
            <p className={LEGAL_ACTION_BODY}>
              Send a request from this signed-in account. A 30-day grace period
              starts before permanent deletion. You can withdraw an open request
              during that grace period.
            </p>
            {token && requestsLoading ? (
              <p className={`${LEGAL_MUTED_INLINE} mt-3`}>
                Loading deletion request status…
              </p>
            ) : null}
            {openRequest ? (
              <div className="mt-4 border-2 border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold uppercase tracking-wide text-foreground">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p>Deletion request pending</p>
                    <p className="mt-1 text-muted-foreground">
                      Requested: {formatDate(openRequest.requestedAt)}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Permanent deletion after:{" "}
                      {formatDate(openRequest.slaDeadline)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={loading}
                    onClick={() => setConfirmWithdrawOpen(true)}
                    className="w-full shrink-0 border-amber-500/70 bg-background/70 font-black uppercase tracking-widest hover:border-amber-700 hover:bg-amber-500/25 hover:text-amber-950 dark:hover:border-amber-300 dark:hover:bg-amber-400/25 dark:hover:text-amber-100 sm:w-auto"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Withdraw request
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className={LEGAL_ACTION_CTA_ROW}>
          {!token ? (
            <BlockShadowButton type="button" onClick={() => openAuth("login")}>
              Sign in to request deletion
            </BlockShadowButton>
          ) : openRequest ? null : (
            <BlockShadowButton
              type="button"
              loading={loading}
              onClick={() => setConfirmRequestOpen(true)}
            >
              Request data deletion
            </BlockShadowButton>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmRequestOpen}
        onClose={() => setConfirmRequestOpen(false)}
        title="Request data deletion?"
        message="This starts a 30-day grace period. After that period, your account data will be permanently deleted or anonymized according to the policy."
        confirmLabel="Confirm deletion request"
        cancelLabel="Keep account"
        variant="danger"
        loading={loading}
        closeOnConfirm={false}
        onConfirm={() => void onRequest().then(() => setConfirmRequestOpen(false))}
      />
      <ConfirmDialog
        open={confirmWithdrawOpen}
        onClose={() => setConfirmWithdrawOpen(false)}
        title="Withdraw deletion request?"
        message="This cancels your open deletion request and keeps your account active."
        confirmLabel="Withdraw request"
        variant="warning"
        hideCancel
        loading={loading}
        closeOnConfirm={false}
        onConfirm={() =>
          void onWithdraw().then(() => setConfirmWithdrawOpen(false))
        }
      />
    </div>
  );
}
