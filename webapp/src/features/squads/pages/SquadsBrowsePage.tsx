"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, UserPlus, UsersRound } from "lucide-react";
import {
  RailFeedEmptyState,
  RailSectionSubheader,
  ShellPageIntroHeader,
  type RailSectionSubheaderSortProps,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { CreateSquadDialog, SquadDirectoryCard } from "@/components/squads";
import { SquadsPageContentSkeleton } from "@/components/skeletons/SquadsPageSkeleton";
import { squadCategoryLabel } from "@/lib/squads/squadCategory";
import { shell, squads } from "@/lib/styles";
import { cn } from "@/lib/core/utils";
import { squadsApi, type SquadSummary } from "@/api/squads";
import { useAuthStore } from "@/store/auth";
import { useAuthDialogStore } from "@/store/authDialog";
import { toast } from "sonner";
type SquadBrowseTab = "all" | "public" | "private" | "yours";
type SquadSort = "newest" | "az" | "oldest";
const BROWSE_TABS: ReadonlyArray<{
  id: SquadBrowseTab;
  label: string;
}> = [
  { id: "all", label: "All squads" },
  { id: "public", label: "Public" },
  { id: "private", label: "Private" },
  { id: "yours", label: "Your squads" },
];
const SQUAD_SORT_OPTIONS: RailSectionSubheaderSortProps["options"] = [
  { value: "newest", label: "Newest first" },
  { value: "az", label: "Name A–Z" },
  { value: "oldest", label: "Oldest first" },
];
function squadCreatedMs(s: SquadSummary): number {
  const raw = s.createdAt;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}
function sortSquads(list: SquadSummary[], sort: SquadSort): SquadSummary[] {
  const next = [...list];
  switch (sort) {
    case "az":
      return next.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    case "oldest":
      return next.sort(
        (a, b) =>
          squadCreatedMs(a) - squadCreatedMs(b) || a.name.localeCompare(b.name),
      );
    case "newest":
    default:
      return next.sort(
        (a, b) =>
          squadCreatedMs(b) - squadCreatedMs(a) || a.name.localeCompare(b.name),
      );
  }
}
function mergeCatalog(
  publicSquads: SquadSummary[],
  mine: SquadSummary[],
): SquadSummary[] {
  const byId = new Map<string, SquadSummary>();
  for (const s of publicSquads) byId.set(s._id, s);
  for (const s of mine) byId.set(s._id, s);
  return [...byId.values()];
}
export default function SquadsBrowsePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [squadFormOpen, setSquadFormOpen] = useState(false);
  const [editingSquad, setEditingSquad] = useState<SquadSummary | null>(null);
  const [browseTab, setBrowseTab] = useState<SquadBrowseTab>("all");
  const [sort, setSort] = useState<SquadSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [publicSquads, setPublicSquads] = useState<SquadSummary[]>([]);
  const [mine, setMine] = useState<SquadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinBusySlug, setJoinBusySlug] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(
      () => setSearchDebounced(searchInput.trim().toLowerCase()),
      280,
    );
    return () => window.clearTimeout(t);
  }, [searchInput]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pub = await squadsApi.listPublic({ limit: 96 });
      setPublicSquads(pub.squads);
      if (token) {
        const m = await squadsApi.listMine(token);
        setMine(m.squads);
      } else {
        setMine([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load squads");
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  const mergedCatalog = useMemo(
    () => mergeCatalog(publicSquads, mine),
    [publicSquads, mine],
  );
  const baseList = useMemo(() => {
    if (browseTab === "yours") return mine;
    if (browseTab === "public")
      return mergedCatalog.filter((s) => s.visibility === "public");
    if (browseTab === "private")
      return mergedCatalog.filter((s) => s.visibility === "private");
    return mergedCatalog;
  }, [browseTab, mine, mergedCatalog]);
  const filteredSquads = useMemo(() => {
    let rows = baseList;
    const q = searchDebounced;
    if (q) {
      rows = rows.filter((s) => {
        const hay =
          `${s.name} ${s.description} ${s.slug} ${s.handle ?? ""} ${s.category ? squadCategoryLabel(s.category) : ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return sortSquads(rows, sort);
  }, [baseList, searchDebounced, sort]);
  const onCreateClick = () => {
    if (!token) {
      openAuth("login");
      return;
    }
    setEditingSquad(null);
    setSquadFormOpen(true);
  };
  const onEditSquadClick = (s: SquadSummary) => {
    if (!token) {
      openAuth("login");
      return;
    }
    setEditingSquad(s);
    setSquadFormOpen(true);
  };
  const handleCardJoin = async (squadSlug: string): Promise<boolean> => {
    const row = mergedCatalog.find((x) => x.slug === squadSlug);
    if (!row) return false;
    if (!token) {
      openAuth("login");
      return false;
    }
    if (row.visibility === "private") {
      router.push(`/squads/${encodeURIComponent(squadSlug)}`);
      return false;
    }
    setJoinBusySlug(squadSlug);
    try {
      await squadsApi.join(squadSlug, token);
      toast.success("Joined squad");
      await load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not join");
      throw e;
    } finally {
      setJoinBusySlug(null);
    }
  };
  const showMembershipAuthGate =
    !token && (browseTab === "yours" || browseTab === "private");
  const browseButtons = useMemo(
    () =>
      BROWSE_TABS.map((tab) => ({
        label: tab.label,
        onClick: () => setBrowseTab(tab.id),
        variant:
          browseTab === tab.id ? ("primary" as const) : ("default" as const),
        ariaLabel: tab.label,
      })),
    [browseTab],
  );
  const publicCountInCatalog = useMemo(
    () => mergedCatalog.filter((s) => s.visibility === "public").length,
    [mergedCatalog],
  );
  const privateCountInMemberships = useMemo(
    () => mine.filter((s) => s.visibility === "private").length,
    [mine],
  );
  return (
    <div className={cn(shell.contentRail, "flex min-h-0 flex-1 flex-col")}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[{ href: "/", label: "Home" }, { label: "Squads" }]}
          description="Small groups for reading and writing together—public or private, with clear rules for who can post."
          descriptionEnd={
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="font-mono text-[10px] font-black uppercase tracking-widest"
                onClick={onCreateClick}
              >
                <UserPlus
                  className="size-4 shrink-0"
                  strokeWidth={2.5}
                  aria-hidden
                />
                Create squad
              </Button>
            </div>
          }
          title={
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
              Reader{" "}
              <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                squads.
              </span>
            </h1>
          }
        />

        {loading ? (
          <SquadsPageContentSkeleton />
        ) : (
          <>
            <RailSectionSubheader
              buttons={browseButtons}
              search={{
                value: searchInput,
                onChange: setSearchInput,
                placeholder: "Search squads…",
                ariaLabel: "Search squads",
                disabled: showMembershipAuthGate,
                wrapperClassName: "sm:max-w-[15rem] lg:max-w-[18rem]",
              }}
              sort={{
                id: "squads-sort",
                value: sort,
                onChange: (v) => setSort(v as SquadSort),
                options: SQUAD_SORT_OPTIONS,
                placeholder: "Sort",
                disabled: showMembershipAuthGate,
              }}
            />

            <div className="min-w-0 flex-1 space-y-3">
              {showMembershipAuthGate ? (
                <RailFeedEmptyState
                  icon={UsersRound}
                  title={
                    browseTab === "private"
                      ? "Sign in to see private squads"
                      : "Sign in to see your squads"
                  }
                  description="All squads and Public stay available without an account."
                  actions={[
                    {
                      label: "Sign in",
                      onClick: () => openAuth("login"),
                      variant: "primary",
                    },
                  ]}
                />
              ) : filteredSquads.length === 0 &&
                searchDebounced &&
                baseList.length > 0 ? (
                <RailFeedEmptyState
                  icon={UsersRound}
                  variant="filter"
                  title="No squads match these filters"
                  description="Try another search term or switch tabs."
                  actions={[
                    {
                      label: "Clear search",
                      onClick: () => setSearchInput(""),
                    },
                  ]}
                />
              ) : filteredSquads.length === 0 ? (
                <RailFeedEmptyState
                  icon={UsersRound}
                  title={
                    browseTab === "yours"
                      ? "You are not in any squads yet"
                      : browseTab === "private" &&
                          privateCountInMemberships === 0
                        ? "No private squads yet"
                        : browseTab === "public" && publicCountInCatalog === 0
                          ? "No public squads yet"
                          : "No squads match these filters"
                  }
                  description={
                    browseTab === "yours"
                      ? "Create one or ask for an invite, or browse All squads and Public."
                      : browseTab === "private" &&
                          privateCountInMemberships === 0
                        ? "Create a private squad or accept an invite—private groups never appear in the public directory."
                        : browseTab === "public" && publicCountInCatalog === 0
                          ? "Be the first to create one—or browse topics while the directory grows."
                          : "Try another search term or switch tabs."
                  }
                  actions={[
                    ...(browseTab === "public" && publicSquads.length === 0
                      ? [
                          {
                            label: "Browse topics",
                            href: "/topics",
                            variant: "primary" as const,
                            icon: (
                              <Compass
                                className="size-4 shrink-0"
                                strokeWidth={2.5}
                                aria-hidden
                              />
                            ),
                          },
                        ]
                      : []),
                    ...(browseTab === "yours" || browseTab === "private"
                      ? [
                          {
                            label: "Browse all or create",
                            onClick: () => {
                              setBrowseTab("all");
                              onCreateClick();
                            },
                            variant: "primary" as const,
                          },
                        ]
                      : []),
                  ]}
                />
              ) : (
                <ul className={squads.discoverCardGrid}>
                  {filteredSquads.map((s) => (
                    <li key={s._id} className="w-full">
                      <SquadDirectoryCard
                        squad={s}
                        isMember={s.viewerRole != null}
                        isAdmin={s.viewerRole === "admin"}
                        joinBusy={joinBusySlug === s.slug}
                        onJoin={handleCardJoin}
                        onEditSquad={
                          token ? () => onEditSquadClick(s) : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {token ? (
        <CreateSquadDialog
          open={squadFormOpen}
          onClose={() => {
            setSquadFormOpen(false);
            setEditingSquad(null);
          }}
          accessToken={token}
          mode={editingSquad ? "edit" : "create"}
          initialSquad={editingSquad}
          onCreated={(slug) =>
            router.push(`/squads/${encodeURIComponent(slug)}`)
          }
          onUpdated={() => void load()}
        />
      ) : null}
    </div>
  );
}
