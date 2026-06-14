"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  ProfileSectionAccordion,
  type ProfileSectionVariant,
} from "@/components/ui/editor";
import { CertificationCard } from "@/components/settings-list/CertificationCard";
import { ProjectCard } from "@/components/settings-list/ProjectCard";
import { OpenSourceCard } from "@/components/settings-list/OpenSourceCard";
import { ProfileCardSkeleton } from "@/components/skeletons";
import { RetroCardFooterButton } from "@/components/ui/button";
import {
  certificationListKey,
  domainFromUrl,
  entriesCountSubtitle,
  isImageUrl,
  openSourceListKey,
  projectListKey,
  reposCountSubtitle,
} from "@/lib/profile/profileDisplay";
import { openSourcePublicationUrl } from "@/lib/profile/profilePortfolioData";

export type ProfilePortfolioAccordionsProps = Readonly<{
  certifications: unknown[];
  projects: unknown[];
  openSourceList: unknown[];
  openSectionId: ProfileSectionVariant | null;
  visibleCounts: Record<ProfileSectionVariant, number>;
  sectionLoading: Record<ProfileSectionVariant, boolean>;
  setSectionOpen: (variant: ProfileSectionVariant, open: boolean) => void;
  viewMore: (variant: ProfileSectionVariant, step?: number) => void;
  formatMonthYear: (val: string | undefined) => string;
  mode: "self" | "public";
  onAddCertification?: () => void;
  onAddProject?: () => void;
  onAddOpenSource?: () => void;
  onEditCertification?: (index: number) => void;
  onEditProject?: (index: number) => void;
  footerVariant?: "default" | "retro";
  openSourceEmptyMessage?: string;
  openSourceEmptyActionLabel?: string;
}>;

function ProfileSectionViewMoreFooter({
  loading,
  label,
  onClick,
  variant,
  className,
}: Readonly<{
  loading: boolean;
  label: string;
  onClick: () => void;
  variant: "default" | "retro";
  className?: string;
}>) {
  if (variant === "retro") {
    return (
      <RetroCardFooterButton
        type="button"
        disabled={loading}
        onClick={onClick}
        className={className}
      >
        {loading ? "LOADING…" : label}
      </RetroCardFooterButton>
    );
  }
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={
        className ??
        "w-full border-2 border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
      }
    >
      {loading ? "LOADING…" : label}
    </button>
  );
}

function AddHeaderAction({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center gap-1 border-2 border-border bg-card px-2 py-1 text-[10px] font-black uppercase shadow transition-colors hover:text-primary active:translate-x-0.5 active:shadow-none"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <Plus className="size-3" /> Add
    </div>
  );
}

function PortfolioEmptyState({
  message,
  action,
}: Readonly<{
  message: string;
  action?: ReactNode;
}>) {
  return (
    <div className="border-2 border-dashed border-border bg-muted/5 p-8 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {message}
      </p>
      {action}
    </div>
  );
}

export function ProfilePortfolioAccordions({
  certifications,
  projects,
  openSourceList,
  openSectionId,
  visibleCounts,
  sectionLoading,
  setSectionOpen,
  viewMore,
  formatMonthYear,
  mode,
  onAddCertification,
  onAddProject,
  onAddOpenSource,
  onEditCertification,
  onEditProject,
  footerVariant = mode === "public" ? "retro" : "default",
  openSourceEmptyMessage,
  openSourceEmptyActionLabel = "Add",
}: ProfilePortfolioAccordionsProps) {
  const isSelf = mode === "self";

  return (
    <>
      <ProfileSectionAccordion
        variant="certification"
        open={openSectionId === "certification"}
        onOpenChange={(open) => setSectionOpen("certification", open)}
        subtitle={entriesCountSubtitle(certifications.length)}
        headerAction={
          isSelf && onAddCertification ? (
            <AddHeaderAction onClick={onAddCertification} />
          ) : undefined
        }
      >
        {certifications.length > 0 ? (
          <div className="space-y-4">
            {sectionLoading.certification ? (
              <ProfileCardSkeleton lines={4} />
            ) : (
              certifications
                .slice(0, visibleCounts.certification)
                .map((c, i) => (
                  <CertificationCard
                    key={certificationListKey(c as Record<string, unknown>)}
                    cert={c}
                    index={i}
                    saving={false}
                    onEdit={() => onEditCertification?.(i)}
                    onRemove={() => {}}
                    onPreviewMedia={() => {}}
                    formatMonthYear={formatMonthYear}
                    domainFromUrl={domainFromUrl}
                    isImageUrl={isImageUrl}
                    hideActions
                  />
                ))
            )}
            {certifications.length > visibleCounts.certification ? (
              <div className="pt-2">
                <ProfileSectionViewMoreFooter
                  variant={footerVariant}
                  loading={sectionLoading.certification}
                  onClick={() => viewMore("certification", 1)}
                  label={`View more (${visibleCounts.certification}/${certifications.length})`}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <PortfolioEmptyState
            message={
              isSelf ? "Add certifications" : "No certifications"
            }
            action={
              isSelf && onAddCertification ? (
                <button
                  type="button"
                  onClick={onAddCertification}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:underline"
                >
                  <Plus className="size-3" /> Add
                </button>
              ) : undefined
            }
          />
        )}
      </ProfileSectionAccordion>

      <ProfileSectionAccordion
        variant="project"
        open={openSectionId === "project"}
        onOpenChange={(open) => setSectionOpen("project", open)}
        subtitle={entriesCountSubtitle(projects.length)}
        headerAction={
          isSelf && onAddProject ? (
            <AddHeaderAction onClick={onAddProject} />
          ) : undefined
        }
      >
        {projects.length > 0 ? (
          <div className="space-y-4">
            {sectionLoading.project ? (
              <ProfileCardSkeleton lines={4} />
            ) : (
              projects
                .slice(0, visibleCounts.project)
                .map((p, i) => (
                  <ProjectCard
                    key={projectListKey(p as Record<string, unknown>)}
                    project={p}
                    index={i}
                    saving={false}
                    onEdit={() => onEditProject?.(i)}
                    onRemove={() => {}}
                    onPreviewMedia={() => {}}
                    formatMonthYear={formatMonthYear}
                    domainFromUrl={domainFromUrl}
                    isImageUrl={isImageUrl}
                    hideActions
                  />
                ))
            )}
            {projects.length > visibleCounts.project ? (
              <div className="pt-2">
                <ProfileSectionViewMoreFooter
                  variant={footerVariant}
                  loading={sectionLoading.project}
                  onClick={() => viewMore("project", 1)}
                  label={`View more (${visibleCounts.project}/${projects.length})`}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <PortfolioEmptyState
            message={isSelf ? "Add your projects" : "No projects"}
            action={
              isSelf && onAddProject ? (
                <button
                  type="button"
                  onClick={onAddProject}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:underline"
                >
                  <Plus className="size-3" /> Add
                </button>
              ) : undefined
            }
          />
        )}
      </ProfileSectionAccordion>

      <ProfileSectionAccordion
        variant="openSource"
        open={openSectionId === "openSource"}
        onOpenChange={(open) => setSectionOpen("openSource", open)}
        subtitle={reposCountSubtitle(openSourceList.length)}
        headerAction={
          isSelf && onAddOpenSource ? (
            <AddHeaderAction onClick={onAddOpenSource} />
          ) : undefined
        }
      >
        {openSourceList.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sectionLoading.openSource ? (
              <>
                <ProfileCardSkeleton lines={3} />
                <ProfileCardSkeleton lines={3} />
              </>
            ) : (
              openSourceList
                .slice(0, visibleCounts.openSource)
                .map((item, i) => (
                  <OpenSourceCard
                    key={openSourceListKey(item as Record<string, unknown>)}
                    item={item}
                    index={i}
                    saving={false}
                    onOpen={() => {
                      const url = openSourcePublicationUrl(item);
                      if (url) {
                        globalThis.open(url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    onDetach={() => {}}
                    hideActions
                  />
                ))
            )}
            {openSourceList.length > visibleCounts.openSource ? (
              <div className="pt-1 md:col-span-2">
                <ProfileSectionViewMoreFooter
                  variant={footerVariant}
                  loading={sectionLoading.openSource}
                  onClick={() => viewMore("openSource", 2)}
                  className={
                    footerVariant === "retro" ? "w-full disabled:opacity-50" : undefined
                  }
                  label={`View more (${Math.min(visibleCounts.openSource, openSourceList.length)}/${openSourceList.length})`}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <PortfolioEmptyState
            message={
              openSourceEmptyMessage ??
              (isSelf ? "Add open source" : "No open source repos")
            }
            action={
              isSelf && onAddOpenSource ? (
                <button
                  type="button"
                  onClick={onAddOpenSource}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:underline"
                >
                  <Plus className="size-3" /> {openSourceEmptyActionLabel}
                </button>
              ) : undefined
            }
          />
        )}
      </ProfileSectionAccordion>
    </>
  );
}
