"use client";
import { Settings } from "lucide-react";
import {
  SettingsSectionHeading,
  SettingsTabPanel,
  SettingsTabRoot,
} from "@/app/settings/settings-list/SettingsSectionHeading";
export function SettingsComingSoonPlaceholder({
  title,
  description = "This module is not available yet.",
  icon = <Settings />,
}: Readonly<{
  title: string | undefined;
  description?: string;
  icon?: React.ReactNode;
}>) {
  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={icon}
        title={title ?? "Section"}
        description={description}
      />
      <SettingsTabPanel>
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border bg-muted/10 py-16 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Status
          </p>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Coming soon.
          </p>
        </div>
      </SettingsTabPanel>
    </SettingsTabRoot>
  );
}
