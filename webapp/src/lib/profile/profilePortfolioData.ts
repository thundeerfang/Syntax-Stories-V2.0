export type ProfileProjectsSplit = Readonly<{
  nonGithub: unknown[];
  github: unknown[];
}>;

export function buildProfileProjects(
  projects: unknown[] | undefined,
): ProfileProjectsSplit {
  const full = projects ?? [];
  const isGithub = (p: unknown) =>
    (p as { source?: string }).source === "github";
  return {
    nonGithub: full.filter((p) => !isGithub(p)),
    github: full.filter(isGithub),
  };
}

export function openSourcePublicationUrl(item: unknown): string {
  const rec = item as Record<string, unknown>;
  if (typeof rec.publicationUrl === "string" && rec.publicationUrl) {
    return rec.publicationUrl;
  }
  if (typeof rec.url === "string" && rec.url) {
    return rec.url;
  }
  if (typeof rec.repositoryUrl === "string" && rec.repositoryUrl) {
    return rec.repositoryUrl;
  }
  return "";
}

export function buildOpenSourceList(
  profileProjects: ProfileProjectsSplit,
  openSourceContributions: unknown[] | undefined,
  limit = 7,
): unknown[] {
  const fromProjects = profileProjects.github;
  const fromContributions = (openSourceContributions ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    return {
      ...row,
      repoFullName:
        row.repoFullName ?? row.repository ?? row.repo ?? row.title,
      publicationUrl:
        row.publicationUrl ?? row.repositoryUrl ?? row.url,
    };
  });
  return [...fromProjects, ...fromContributions].slice(0, limit);
}
