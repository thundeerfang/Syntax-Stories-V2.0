"use client";
import React from "react";
import { Plus } from "lucide-react";
import { BlockShadowButton } from "@/components/ui/button";
type ProfileSectionHeaderProps = Readonly<{
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  showAdd?: boolean;
  onAddClick?: () => void;
}>;
export function ProfileSectionHeader({
  icon: Icon,
  title,
  showAdd = true,
  onAddClick,
}: ProfileSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 mb-4">
      <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {showAdd && onAddClick ? (
        <BlockShadowButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddClick}
        >
          <Plus className="size-3" /> Add
        </BlockShadowButton>
      ) : null}
    </div>
  );
}
