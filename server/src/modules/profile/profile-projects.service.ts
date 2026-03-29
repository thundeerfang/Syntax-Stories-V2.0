/** Sets `prjLog` on each project when the projects array is updated. */
export function normalizeProjectsPrjLog(updates: Record<string, unknown>): void {
  const projects = updates.projects as Array<{ prjLog?: string; [k: string]: unknown }> | undefined;
  if (!Array.isArray(projects) || projects.length === 0) return;
  const year = new Date().getFullYear();
  const logValue = `${year}_prd_log`;
  for (const p of projects) {
    p.prjLog = logValue;
  }
  updates.projects = projects;
}
