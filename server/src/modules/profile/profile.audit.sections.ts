import { writeAuditLog } from '../../shared/audit/auditLog.js';
import { AuditAction, type AuditActionName } from '../../shared/audit/events.js';
import type { ProfileUpdatedPayload } from '../../shared/events/appEvents.js';
import type { ProfileSections } from './profile.types.js';

type SectionLogFn = (action: AuditActionName, targetType: string, metadata: Record<string, unknown>) => void;

function auditStackTools(
  log: SectionLogFn,
  currentProfile: ProfileSections,
  updatedProfile: ProfileSections & { _id: unknown }
): void {
  const oldList = currentProfile.stackAndTools ?? [];
  const newList = updatedProfile.stackAndTools ?? [];
  for (const t of newList) {
    if (!oldList.includes(t)) log(AuditAction.STACK_TOOL_ADDED, 'profile', { tool: t });
  }
  for (const t of oldList) {
    if (!newList.includes(t)) log(AuditAction.STACK_TOOL_REMOVED, 'profile', { tool: t });
  }
}

function auditEducation(
  log: SectionLogFn,
  currentProfile: ProfileSections,
  updatedProfile: ProfileSections & { _id: unknown }
): void {
  const oldE = (currentProfile.education ?? []) as Array<{ eduId?: string; school?: string }>;
  const newE = (updatedProfile.education ?? []) as Array<{ eduId?: string; school?: string }>;
  const oldIds = new Set(oldE.map((e) => (e.eduId ?? '').trim()).filter(Boolean));
  const newIds = new Set(newE.map((e) => (e.eduId ?? '').trim()).filter(Boolean));
  for (const e of newE) {
    const id = (e.eduId ?? '').trim();
    if (!id) continue;
    if (oldIds.has(id)) {
      const prev = oldE.find((x) => (x.eduId ?? '').trim() === id);
      if (prev && JSON.stringify(prev) !== JSON.stringify(e)) log(AuditAction.EDUCATION_UPDATED, 'education', { eduId: id });
    } else {
      log(AuditAction.EDUCATION_ADDED, 'education', { eduId: id, school: e.school });
    }
  }
  for (const id of oldIds) {
    if (!newIds.has(id)) log(AuditAction.EDUCATION_REMOVED, 'education', { eduId: id });
  }
}

function auditWorkExperiences(
  log: SectionLogFn,
  currentProfile: ProfileSections,
  updatedProfile: ProfileSections & { _id: unknown }
): void {
  const oldW = (currentProfile.workExperiences ?? []) as Array<{ workId?: string; company?: string }>;
  const newW = (updatedProfile.workExperiences ?? []) as Array<{ workId?: string; company?: string }>;
  const oldIds = new Set(oldW.map((w) => (w.workId ?? '').trim()).filter(Boolean));
  const newIds = new Set(newW.map((w) => (w.workId ?? '').trim()).filter(Boolean));
  for (const w of newW) {
    const id = (w.workId ?? '').trim();
    if (!id) continue;
    if (oldIds.has(id)) {
      const prev = oldW.find((x) => (x.workId ?? '').trim() === id);
      if (prev && JSON.stringify(prev) !== JSON.stringify(w)) log(AuditAction.WORK_UPDATED, 'work', { workId: id });
    } else {
      log(AuditAction.WORK_ADDED, 'work', { workId: id, company: w.company });
    }
  }
  for (const id of oldIds) {
    if (!newIds.has(id)) log(AuditAction.WORK_REMOVED, 'work', { workId: id });
  }
}

function auditCertifications(
  log: SectionLogFn,
  currentProfile: ProfileSections,
  updatedProfile: ProfileSections & { _id: unknown }
): void {
  const oldC = (currentProfile.certifications ?? []) as Array<{ certId?: string; name?: string }>;
  const newC = (updatedProfile.certifications ?? []) as Array<{ certId?: string; name?: string }>;
  const oldIds = new Set(oldC.map((c) => (c.certId ?? '').trim()).filter(Boolean));
  const newIds = new Set(newC.map((c) => (c.certId ?? '').trim()).filter(Boolean));
  for (const c of newC) {
    const id = (c.certId ?? '').trim();
    if (!id) continue;
    if (oldIds.has(id)) {
      const prev = oldC.find((x) => (x.certId ?? '').trim() === id);
      if (prev && JSON.stringify(prev) !== JSON.stringify(c)) log(AuditAction.CERTIFICATION_UPDATED, 'certification', { certId: id });
    } else {
      log(AuditAction.CERTIFICATION_ADDED, 'certification', { certId: id, name: c.name });
    }
  }
  for (const id of oldIds) {
    if (!newIds.has(id)) log(AuditAction.CERTIFICATION_REMOVED, 'certification', { certId: id });
  }
}

function auditProjects(
  log: SectionLogFn,
  currentProfile: ProfileSections,
  updatedProfile: ProfileSections & { _id: unknown }
): void {
  const oldP = (currentProfile.projects ?? []) as Array<{ title?: string }>;
  const newP = (updatedProfile.projects ?? []) as Array<{ title?: string }>;
  if (newP.length > oldP.length) {
    for (let i = oldP.length; i < newP.length; i++) {
      const p = newP[i];
      log(AuditAction.PROJECT_ADDED, 'project', { index: i, title: p?.title });
    }
  }
  if (newP.length < oldP.length) {
    for (let i = newP.length; i < oldP.length; i++) {
      log(AuditAction.PROJECT_REMOVED, 'project', { index: i });
    }
  }
  const minLen = Math.min(oldP.length, newP.length);
  for (let i = 0; i < minLen; i++) {
    if (JSON.stringify(oldP[i]) !== JSON.stringify(newP[i])) {
      log(AuditAction.PROJECT_UPDATED, 'project', { index: i, title: newP[i]?.title });
    }
  }
}

function auditOpenSource(
  log: SectionLogFn,
  currentProfile: ProfileSections,
  updatedProfile: ProfileSections & { _id: unknown }
): void {
  const oldO = (currentProfile.openSourceContributions ?? []) as Array<{ repositoryUrl?: string; title?: string }>;
  const newO = (updatedProfile.openSourceContributions ?? []) as Array<{ repositoryUrl?: string; title?: string }>;
  const oldKeys = new Set(oldO.map((o, i) => (o.repositoryUrl ?? '').trim() || `i:${i}`));
  const newKeys = new Set(newO.map((o, i) => (o.repositoryUrl ?? '').trim() || `i:${i}`));
  for (let i = 0; i < newO.length; i++) {
    const o = newO[i];
    const key = (o.repositoryUrl ?? '').trim() || `i:${i}`;
    if (oldKeys.has(key)) {
      const prev = oldO.find((x, j) => ((x.repositoryUrl ?? '').trim() || `i:${j}`) === key);
      if (prev && JSON.stringify(prev) !== JSON.stringify(o)) {
        log(AuditAction.OPEN_SOURCE_UPDATED, 'open_source', { repositoryUrl: o.repositoryUrl, title: o.title });
      }
    } else {
      log(AuditAction.OPEN_SOURCE_ADDED, 'open_source', { repositoryUrl: o.repositoryUrl, title: o.title });
    }
  }
  for (let i = 0; i < oldO.length; i++) {
    const key = (oldO[i].repositoryUrl ?? '').trim() || `i:${i}`;
    if (!newKeys.has(key)) log(AuditAction.OPEN_SOURCE_REMOVED, 'open_source', { repositoryUrl: oldO[i].repositoryUrl, title: oldO[i].title });
  }
}

function auditMySetup(
  log: SectionLogFn,
  currentProfile: ProfileSections,
  updatedProfile: ProfileSections & { _id: unknown }
): void {
  const oldM = (currentProfile.mySetup ?? []) as Array<{ label?: string; imageUrl?: string }>;
  const newM = (updatedProfile.mySetup ?? []) as Array<{ label?: string; imageUrl?: string }>;
  if (newM.length > oldM.length) {
    for (let i = oldM.length; i < newM.length; i++) {
      const m = newM[i];
      log(AuditAction.MY_SETUP_ADDED, 'my_setup', { label: m?.label, index: i });
    }
  }
  if (newM.length < oldM.length) {
    for (let i = newM.length; i < oldM.length; i++) {
      log(AuditAction.MY_SETUP_REMOVED, 'my_setup', { label: oldM[i]?.label, index: i });
    }
  }
  const minLen = Math.min(oldM.length, newM.length);
  for (let i = 0; i < minLen; i++) {
    if (JSON.stringify(oldM[i]) !== JSON.stringify(newM[i])) {
      log(AuditAction.MY_SETUP_UPDATED, 'my_setup', { label: newM[i]?.label, index: i });
    }
  }
}

/** Diff profile sections for granular audit lines (stack, education, work, …). */
export function runProfileSectionAudits(payload: ProfileUpdatedPayload): void {
  const { req, actorId, updates, currentProfile, updatedProfile } = payload;
  if (!currentProfile) return;

  const log: SectionLogFn = (action, targetType, metadata) => {
    void writeAuditLog(req, action, { actorId, targetType, targetId: actorId, metadata });
  };

  if (updates.stackAndTools !== undefined) {
    auditStackTools(log, currentProfile, updatedProfile);
  }
  if (updates.education !== undefined) {
    auditEducation(log, currentProfile, updatedProfile);
  }
  if (updates.workExperiences !== undefined) {
    auditWorkExperiences(log, currentProfile, updatedProfile);
  }
  if (updates.certifications !== undefined) {
    auditCertifications(log, currentProfile, updatedProfile);
  }
  if (updates.projects !== undefined) {
    auditProjects(log, currentProfile, updatedProfile);
  }
  if (updates.openSourceContributions !== undefined) {
    auditOpenSource(log, currentProfile, updatedProfile);
  }
  if (updates.mySetup !== undefined) {
    auditMySetup(log, currentProfile, updatedProfile);
  }
}
