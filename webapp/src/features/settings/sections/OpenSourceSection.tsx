"use client";
import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { Github, Loader2 } from "lucide-react";
import { BlockShadowButton } from "@/components/ui";
import { GithubNotConnectedDialog } from "@/app/settings/GithubNotConnectedDialog";
import { useSettingsAuthSlice } from "@/hooks/useSettingsAuthSlice";
import { authApi } from "@/api/auth";
import { projectMatchesGithubRepo } from "@/lib/profile/githubProjectIdentity";
import { FormDialog } from "@/components/ui/dialog";
import { FormInput } from "@/components/retroui";
import { OpenSourceCard } from "@/components/settings-list/OpenSourceCard";
import { SettingsSectionHeader } from "@/app/settings/settings-list/Header";
import {
  SettingsTabPanel,
  SettingsTabRoot,
} from "@/app/settings/settings-list/SettingsSectionHeading";
import { SettingsSectionEmptyState } from "@/components/settings";
type OpenSourceGitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  owner: {
    login: string;
  };
  archived?: boolean;
};
export function OpenSourceContent() {
  const { user, updateProfile, token } = useSettingsAuthSlice();
  const apiBase =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
      : "";
  const MAX_OPEN_SOURCE_REPOS = 7;
  const imported = (user?.projects ?? []).filter(
    (p) =>
      (
        p as {
          source?: string;
        }
      ).source === "github",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [githubConnectPromptOpen, setGithubConnectPromptOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [repos, setRepos] = useState<OpenSourceGitHubRepo[]>([]);
  const [query, setQuery] = useState("");
  const fetchRepos = async () => {
    if (!token) return;
    if (!user?.isGitAccount) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/github/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        repos?: OpenSourceGitHubRepo[];
      } | null;
      if (!res.ok || !data?.success)
        throw new Error(data?.message || "Failed to fetch repos.");
      setRepos((data.repos ?? []).filter((r) => !r.archived));
    } catch (e) {
      setRepos([]);
      setError(e instanceof Error ? e.message : "Failed to fetch repos.");
    } finally {
      setLoading(false);
    }
  };
  const openImportDialog = () => {
    if (!user?.isGitAccount) {
      setGithubConnectPromptOpen(true);
      return;
    }
    setDialogOpen(true);
    void fetchRepos();
  };
  const addRepo = async (fullName: string) => {
    if (!token) return;
    if (!user?.isGitAccount) return;
    if (imported.length >= MAX_OPEN_SOURCE_REPOS) {
      toast.error(
        `You can link up to ${MAX_OPEN_SOURCE_REPOS} repositories. Remove one to add another.`,
      );
      return;
    }
    if (
      (user?.projects ?? []).some((p) => projectMatchesGithubRepo(p, fullName))
    ) {
      toast.error("Already in projects.", { id: "syntax-repo-duplicate" });
      return;
    }
    setSaving(true);
    try {
      const data = await authApi.importGithubReposBatch(token, [fullName]);
      if (!data.success)
        throw new Error(data.message || "Failed to import repo.");
      const proj = data.projects?.[0];
      if (!proj) {
        const f = data.failed?.find((x) => x.fullName === fullName);
        throw new Error(f?.message || "Failed to load repo.");
      }
      const next = [...(user?.projects ?? []), proj as any];
      await updateProfile(
        { projects: next, isGitAccount: true },
        { section: "projects" },
      );
      toast.success("Added to projects.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };
  const removeImported = async (repoFullName: string) => {
    const next = (user?.projects ?? []).filter(
      (p) => !projectMatchesGithubRepo(p, repoFullName),
    );
    setSaving(true);
    try {
      await updateProfile({ projects: next as any }, { section: "projects" });
      toast.success("Removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        (r.full_name || "").toLowerCase().includes(q) ||
        (r.name || "").toLowerCase().includes(q),
    );
  }, [repos, query]);
  const repoBusy = loading || saving;
  return (
    <SettingsTabRoot>
      <SettingsSectionHeader
        variant="openSource"
        onPrimaryAction={openImportDialog}
        disabled={loading || saving}
      />

      <SettingsTabPanel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {imported.length === 0 ? (
            <div className="col-span-2">
              <SettingsSectionEmptyState
                icon={Github}
                title="No Repositories Linked"
                tagline="Sync your GitHub projects to display your coding activity."
              />
            </div>
          ) : (
            imported.map((p, i) => (
              <OpenSourceCard
                key={(p as any).repoFullName ?? i}
                item={p}
                index={i}
                saving={saving}
                onOpen={() => {
                  if (p.publicationUrl)
                    window.open(
                      p.publicationUrl,
                      "_blank",
                      "noopener,noreferrer",
                    );
                }}
                onDetach={() => removeImported((p as any).repoFullName || "")}
              />
            ))
          )}
        </div>
      </SettingsTabPanel>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        titleIcon={<Github aria-hidden />}
        title="Add open source"
        titleId="open-source-import"
        subtitle="Pick a repo to add to Projects."
        panelClassName="max-w-2xl"
        footer={
          !repoBusy ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Uses your linked GitHub token
              </p>
              <BlockShadowButton
                type="button"
                shadow="sm"
                loading={loading}
                disabled={saving}
                className="px-5 py-2.5 text-xs tracking-wide"
                onClick={() => void fetchRepos()}
              >
                Refresh
              </BlockShadowButton>
            </div>
          ) : undefined
        }
        interactionLock={repoBusy}
        interactionLockContent={
          repoBusy ? (
            <div className="flex flex-col items-center gap-4 border-2 border-border bg-muted/25 px-10 py-12 text-center dark:border-border dark:bg-black/55">
              <Loader2
                className="size-10 shrink-0 animate-spin text-primary"
                aria-hidden
              />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {saving ? "Saving…" : "Loading repositories…"}
              </p>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="border-2 border-destructive/60 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
          <FormInput
            id="os-search"
            label="Search repos"
            placeholder="Search by name (owner/repo)"
            maxLength={80}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="border-2 border-border bg-muted/10">
            <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-muted/20 px-3 py-2">
              <p className="text-[10px] font-black uppercase text-muted-foreground">
                Repositories
              </p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                {filtered.length}
              </p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-xs text-muted-foreground">
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">
                  No repos found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((r) => {
                    const already = (user?.projects ?? []).some(
                      (p) =>
                        (p.publicationUrl || "").trim() ===
                        (r.html_url || "").trim(),
                    );
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase">
                            {r.name}
                          </p>
                          <p className="truncate text-[10px] font-bold text-muted-foreground">
                            {r.full_name}
                          </p>
                          {r.description && (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                              {r.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <a
                            href={r.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-2 border-border bg-card px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted/30"
                          >
                            View
                          </a>
                          <BlockShadowButton
                            type="button"
                            shadow="sm"
                            size="sm"
                            disabled={saving || already}
                            className="px-3 py-2 text-[10px] tracking-widest"
                            onClick={() => void addRepo(r.full_name)}
                          >
                            {already ? "Added" : "Add"}
                          </BlockShadowButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </FormDialog>

      <GithubNotConnectedDialog
        open={githubConnectPromptOpen}
        onClose={() => setGithubConnectPromptOpen(false)}
      />
    </SettingsTabRoot>
  );
}
