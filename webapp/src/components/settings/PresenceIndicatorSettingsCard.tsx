"use client";
import { Circle } from "lucide-react";
import { Switch } from "@/components/retroui/Switch";
import { UserPresenceDot } from "@/components/ui/UserPresenceDot";
import { cn } from "@/lib/core/utils";
import { useUserPresenceStatus } from "@/lib/presence/useUserPresenceStatus";
import { useUIStore } from "@/store/ui";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
export function PresenceIndicatorSettingsCard({
  profileImg,
  username,
}: Readonly<{
  profileImg?: string;
  username?: string;
}>) {
  const enabled = useUIStore((s) => s.presenceIndicatorEnabled);
  const setEnabled = useUIStore((s) => s.setPresenceIndicatorEnabled);
  const status = useUserPresenceStatus();
  const avatarSrc = resolveProfileMediaUrl(profileImg, username);
  return (
    <section className="border-4 border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-border bg-muted/30">
            <Circle className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Online status indicator
            </h3>
            <p className="mt-0.5 max-w-md text-[9px] font-medium text-muted-foreground/80">
              Show a green dot on your navbar avatar when you are active on this
              device. It turns gray when the tab is in the background or you are
              offline.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:pt-1">
          <span className="text-[9px] font-bold uppercase text-muted-foreground">
            {enabled ? "On" : "Off"}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Show online status indicator on avatar"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 border-2 border-border bg-muted/15 p-4">
        <div className="relative size-12 shrink-0 overflow-hidden border-2 border-border bg-card shadow">
          <img src={avatarSrc} alt="" className="size-full object-cover" />
          {enabled ? (
            <UserPresenceDot status={status} className="size-3" />
          ) : null}
        </div>
        <ul className="space-y-1 text-[9px] font-medium text-muted-foreground">
          <li className="flex items-center gap-2">
            <span
              className={cn(
                "size-2.5 border-2 border-border bg-green-500",
                enabled && "presence-dot-blink",
              )}
            />
            <span>Green — active on this tab</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 border-2 border-border bg-muted-foreground/75" />
            <span>Gray — away or offline</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 border-2 border-border bg-transparent" />
            <span>Hidden — indicator disabled</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
