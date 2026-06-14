"use client";
import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { squadsApi, type SquadMemberRole } from "@/api/squads";
import { Dialog, DIALOG_Z_INDEX_STACKED } from "@/components/ui/dialog";
import { useDropdown } from "@/components/ui/dropdown";
import { retroDropdownPanel, retroSortTrigger } from "@/lib/core/retroUi";
import { cn } from "@/lib/core/utils";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
import { toast } from "sonner";
export type SquadPromoteRoleTarget = Readonly<{
  username: string;
  fullName: string;
  profileImg: string;
  role: SquadMemberRole;
}>;
type PromotableRole = Extract<SquadMemberRole, "member" | "moderator">;
const ROLE_OPTIONS: ReadonlyArray<{
  value: PromotableRole;
  label: string;
  description: string;
}> = [
  {
    value: "member",
    label: "Member",
    description: "Can read and engage; posting depends on squad rules.",
  },
  {
    value: "moderator",
    label: "Moderator",
    description: "Staff access for posting, invites, and moderation tools.",
  },
];
export type SquadPromoteRoleDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  squadSlug: string;
  accessToken: string;
  member: SquadPromoteRoleTarget | null;
  onUpdated: () => void | Promise<void>;
}>;
function RoleSelectDropdown({
  id,
  value,
  onChange,
  disabled,
}: Readonly<{
  id: string;
  value: PromotableRole;
  onChange: (value: PromotableRole) => void;
  disabled?: boolean;
}>) {
  const { rootRef, open, toggle, close } = useDropdown<HTMLDivElement>();
  const selected =
    ROLE_OPTIONS.find((o) => o.value === value) ?? ROLE_OPTIONS[0];
  return (
    <div ref={rootRef} className="relative w-full">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Role: ${selected.label}`}
        onClick={toggle}
        className={cn(retroSortTrigger, "w-full min-w-0")}
      >
        <span className="min-w-0 truncate">{selected.label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Squad role"
          className={retroDropdownPanel}
        >
          {ROLE_OPTIONS.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === o.value}
                className={cn(
                  "flex w-full px-3 py-2.5 text-left font-mono text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-muted/60",
                  value === o.value && "bg-primary/10 text-primary",
                )}
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
export function SquadPromoteRoleDialog({
  open,
  onClose,
  squadSlug,
  accessToken,
  member,
  onUpdated,
}: SquadPromoteRoleDialogProps) {
  const titleId = useId();
  const roleFieldId = useId();
  const [role, setRole] = useState<PromotableRole>("member");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || !member) return;
    setRole(member.role === "moderator" ? "moderator" : "member");
  }, [open, member]);
  const label = member?.fullName?.trim() || member?.username || "Member";
  const currentRole: PromotableRole =
    member?.role === "moderator" ? "moderator" : "member";
  const unchanged = member != null && role === currentRole;
  const selectedOption =
    ROLE_OPTIONS.find((o) => o.value === role) ?? ROLE_OPTIONS[0];
  const save = async () => {
    if (!member || unchanged) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await squadsApi.setMemberRole(
        squadSlug,
        member.username,
        role,
        accessToken,
      );
      toast.success(
        role === "moderator" ? "Promoted to moderator" : "Set as member",
      );
      await onUpdated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update role");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      titleId={titleId}
      showCloseButton
      panelClassName="max-w-sm overflow-visible border-primary/30 dark:border-primary/35"
      contentClassName="p-0 overflow-visible"
      legacyCloseContentInset={false}
      zIndex={DIALOG_Z_INDEX_STACKED}
    >
      <div className="relative min-h-full w-full overflow-visible bg-gradient-to-b from-primary/18 via-primary/8 to-card dark:from-primary/22 dark:via-primary/10 dark:to-card">
        <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center sm:px-8 sm:pb-8 sm:pt-12">
          {member ? (
            <>
              <img
                src={resolveProfileMediaUrl(member.profileImg, member.username)}
                alt=""
                className="size-16 shrink-0 border-2 border-primary/40 object-cover shadow dark:border-primary/50"
              />
              <h2
                id={titleId}
                className="mt-5 max-w-[18rem] text-base font-black uppercase tracking-wide text-foreground sm:text-lg"
              >
                {label}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                @{member.username}
              </p>

              <div className="mt-6 w-full max-w-[20rem] text-left">
                <label
                  htmlFor={roleFieldId}
                  className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
                  Role
                </label>
                <RoleSelectDropdown
                  id={roleFieldId}
                  value={role}
                  onChange={setRole}
                  disabled={busy}
                />
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {selectedOption.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void save()}
                disabled={busy || unchanged}
                aria-busy={busy || undefined}
                className={cn(
                  "mt-8 w-full max-w-[20rem] border-2 border-primary bg-primary px-6 py-3.5 font-black text-xs uppercase tracking-widest text-primary-foreground shadow",
                  "transition-all hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0",
                )}
              >
                {busy ? "Saving…" : "Save role"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
