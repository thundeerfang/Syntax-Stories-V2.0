/** Sets `prjLog` on each project when the projects array is updated. */
export function normalizeProjectsPrjLog(updates) {
    const projects = updates.projects;
    if (!Array.isArray(projects) || projects.length === 0)
        return;
    const year = new Date().getFullYear();
    const logValue = `${year}_prd_log`;
    for (const p of projects) {
        p.prjLog = logValue;
    }
}
//# sourceMappingURL=profile-projects.service.js.map