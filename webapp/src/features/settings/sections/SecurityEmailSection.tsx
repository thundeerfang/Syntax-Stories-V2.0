"use client";
import React, { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ChevronDown, Mail } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { BlockShadowButton, GhostOutlineButton } from "@/components/ui";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/api/auth";
import { Label } from "@/components/retroui";
import {
  SettingsSectionHeading,
  SettingsTabPanel,
  SettingsTabRoot,
} from "@/app/settings/settings-list/SettingsSectionHeading";
export function SecurityEmailContent() {
  const { user, token, refreshUser } = useAuthStore();
  const [newEmail, setNewEmail] = useState("");
  const [codeCurrent, setCodeCurrent] = useState("");
  const [codeNew, setCodeNew] = useState("");
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const handleSendCode = async () => {
    if (sending) return;
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid new email address.");
      return;
    }
    if (email === (user?.email ?? "").trim().toLowerCase()) {
      toast.error("That is already your email.", {
        id: "syntax-email-unchanged",
      });
      return;
    }
    if (!token) {
      toast.error("You must be logged in to change email.");
      return;
    }
    setSending(true);
    try {
      await authApi.initEmailChange(token, email);
      toast.success("Verification codes dispatched.");
      setStep("verify");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send code.");
    } finally {
      setSending(false);
    }
  };
  const handleVerify = async () => {
    if (codeCurrent.length !== 6 || codeNew.length !== 6) {
      toast.error("Both 6-digit codes are required.");
      return;
    }
    if (!token) return;
    setVerifying(true);
    try {
      await authApi.verifyEmailChange(token, codeCurrent, codeNew);
      toast.success("Identity updated. Please re-link your accounts.");
      setStep("enter");
      setNewEmail("");
      setCodeCurrent("");
      setCodeNew("");
      await refreshUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };
  const handleCancelEmailChange = async () => {
    if (token) {
      try {
        await authApi.cancelEmailChange(token);
        toast.info(
          "Update email cancelled. Codes are invalid; request new codes to try again.",
        );
      } catch {
        toast.info("Update email cancelled. Request new codes to try again.");
      }
    }
    setStep("enter");
    setCodeCurrent("");
    setCodeNew("");
  };
  return (
    <SettingsTabRoot>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SettingsSectionHeading
          icon={<Mail />}
          title="Security Protocol: Email"
          description="Authorized personnel only. Changing your primary email requires dual-factor verification."
        />
        <div className="hidden shrink-0 md:flex gap-1">
          <div
            className={cn(
              "px-2 py-1 text-[9px] font-black border-2 transition-colors",
              step === "enter"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            01. INITIATE
          </div>
          <div
            className={cn(
              "px-2 py-1 text-[9px] font-black border-2 transition-colors",
              step === "verify"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            02. VERIFY
          </div>
        </div>
      </header>

      <SettingsTabPanel className="space-y-5">
        {step === "enter" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Current Primary Email
                </Label>
                <div className="p-3 border-2 border-border bg-muted/20 font-mono text-sm opacity-70 italic">
                  {user?.email}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                  New Destination Email
                </Label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full p-3 border-2 border-primary bg-background focus:ring-4 focus:ring-primary/10 outline-none font-mono text-sm transition-all"
                />
              </div>
            </div>

            <BlockShadowButton
              type="button"
              loading={sending}
              disabled={!newEmail.trim()}
              className="px-6 py-3 text-xs tracking-widest"
              onClick={handleSendCode}
            >
              Request Verification Codes
              <ChevronDown className="-rotate-90 size-4" />
            </BlockShadowButton>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-4 border-2 border-border bg-background space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Input Code: Current Email
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={codeCurrent}
                  onChange={(e) =>
                    setCodeCurrent(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="w-full p-4 border-2 border-border bg-muted/10 text-center font-mono text-2xl tracking-[0.5em] focus:border-primary focus:bg-background outline-none transition-all"
                />
                <p className="text-[9px] text-muted-foreground text-center">
                  Check: {user?.email}
                </p>
              </div>

              <div className="p-4 border-2 border-primary/50 bg-background space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Input Code: New Email
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={codeNew}
                  onChange={(e) =>
                    setCodeNew(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="w-full p-4 border-2 border-primary text-center font-mono text-2xl tracking-[0.5em] focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                />
                <p className="text-[9px] text-muted-foreground text-center">
                  Check: {newEmail}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <BlockShadowButton
                type="button"
                loading={verifying}
                className="flex-1 py-4 text-sm tracking-widest"
                onClick={handleVerify}
              >
                Confirm Email Change
              </BlockShadowButton>
              <GhostOutlineButton
                type="button"
                onClick={handleCancelEmailChange}
                size="lg"
              >
                Cancel
              </GhostOutlineButton>
            </div>
          </div>
        )}
      </SettingsTabPanel>

      <div className="border-2 border-dashed border-border bg-muted/5 flex gap-4 items-start p-4">
        <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong>Security Note:</strong> Changing your email is a high-level
          action. Upon successful update, all current OAuth sessions (Google,
          GitHub, etc.) will be terminated for your protection. You must
          re-authenticate using the new credentials.
        </p>
      </div>
    </SettingsTabRoot>
  );
}
