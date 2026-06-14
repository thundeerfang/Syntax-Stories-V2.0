"use client";
import { useState } from "react";
import { ChevronRight, Layers, UsersRound } from "lucide-react";
import { SquadsCategoriesFollowDialog } from "./dialog/SquadsCategoriesFollowDialog";
import { useProfileSquadsAndCategories } from "@/hooks/useProfileSquadsAndCategories";
export type ProfileSquadsCategoriesCardProps = Readonly<{
  username: string | null;
  userId: string | null;
  token: string | null;
  isSelf: boolean;
}>;
function formatSubtitle(
  squadCount: number,
  categoryCount: number,
  showCategories: boolean,
  loading: boolean,
): string {
  if (loading) return "Loading…";
  if (squadCount === 0 && (!showCategories || categoryCount === 0)) {
    return showCategories
      ? "No squads or categories yet"
      : "No public squads yet";
  }
  const parts: string[] = [];
  parts.push(squadCount === 1 ? "1 squad" : `${squadCount} squads`);
  if (showCategories) {
    parts.push(
      categoryCount === 1 ? "1 category" : `${categoryCount} categories`,
    );
  }
  return parts.join(" · ");
}
export function ProfileSquadsCategoriesCard({
  username,
  userId,
  token,
  isSelf,
}: ProfileSquadsCategoriesCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    squads,
    categories,
    squadCount,
    loadingSquads,
    loadingCategories,
    showCategories,
    refreshCategories,
    refreshSquads,
  } = useProfileSquadsAndCategories({ username, userId, token, isSelf });
  const categoryCount = categories.length;
  const loading = loadingSquads || (showCategories && loadingCategories);
  const subtitle = formatSubtitle(
    squadCount,
    categoryCount,
    showCategories,
    loading,
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        aria-label={
          showCategories ? "Open squads and categories" : "Open squads"
        }
        className="w-full border-4 border-border bg-card p-4 shadow text-left transition-transform active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 border-2 border-border bg-muted/50 flex items-center justify-center shrink-0">
              {showCategories ? (
                <Layers className="size-4 text-primary" aria-hidden />
              ) : (
                <UsersRound className="size-4 text-primary" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase">
                {showCategories ? "Squads & Categories" : "Squads"}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5 truncate">
                {subtitle}
              </p>
            </div>
          </div>
          <span
            className="p-2 border-2 border-border bg-card shrink-0"
            aria-hidden
          >
            <ChevronRight className="size-4 text-foreground" />
          </span>
        </div>
      </button>

      <SquadsCategoriesFollowDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        squads={squads}
        categories={categories}
        showCategories={showCategories}
        isSelf={isSelf}
        token={token}
        loadingSquads={loadingSquads}
        loadingCategories={loadingCategories}
        userId={userId}
        onCategoriesChange={() => void refreshCategories()}
        onSquadsChange={() => void refreshSquads()}
      />
    </>
  );
}
