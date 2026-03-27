import type { Request, Response } from 'express';
import { STACK_AND_TOOLS_MAX } from '../../../constants/profileLimits';
import { UserModel, normalizeProfileImg } from '../../../models/User';
import type { AuthUser } from '../../../middlewares/auth';
import { writeAuditLog } from '../../../shared/audit/auditLog';
import { AuditAction, type AuditActionName } from '../../../shared/audit/events';

const UPDATE_PROFILE_KEYS = [
  'fullName', 'username', 'bio', 'profileImg', 'coverBanner', 'job',
  'portfolioUrl', 'linkedin', 'instagram', 'github', 'youtube',
  'stackAndTools', 'workExperiences', 'education', 'certifications', 'projects', 'openSourceContributions', 'mySetup',
] as const;

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const found = await UserModel.findById(user._id).lean();
    if (!found) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }
    const f = found as { createdAt?: Date };
    res.status(200).json({
      success: true,
      user: {
        _id: found._id,
        fullName: found.fullName,
        username: found.username,
        email: found.email,
        profileImg: normalizeProfileImg(found.profileImg),
        coverBanner: found.coverBanner,
        bio: found.bio,
        job: found.job,
        portfolioUrl: (found as any).portfolioUrl,
        linkedin: found.linkedin,
        instagram: found.instagram,
        github: found.github,
        youtube: found.youtube,
        stackAndTools: found.stackAndTools,
        workExperiences: found.workExperiences,
        education: found.education,
        certifications: found.certifications,
        projects: found.projects,
        openSourceContributions: found.openSourceContributions,
        mySetup: (found as any).mySetup,
        isGoogleAccount: found.isGoogleAccount,
        isGitAccount: found.isGitAccount,
        isFacebookAccount: found.isFacebookAccount,
        isXAccount: found.isXAccount,
        isAppleAccount: found.isAppleAccount,
        isDiscordAccount: (found as { isDiscordAccount?: boolean }).isDiscordAccount ?? false,
        twoFactorEnabled: found.twoFactorEnabled,
        createdAt: f.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const key of UPDATE_PROFILE_KEYS) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (Array.isArray(updates.stackAndTools)) {
      const arr = (updates.stackAndTools as unknown[]).filter((t) => typeof t === 'string') as string[];
      updates.stackAndTools = arr.slice(0, STACK_AND_TOOLS_MAX);
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No valid fields to update', success: false });
      return;
    }

    type ProfileSections = { education?: unknown[]; workExperiences?: unknown[]; projects?: unknown[]; certifications?: unknown[]; openSourceContributions?: unknown[]; stackAndTools?: string[]; mySetup?: unknown[] };
    const profileSectionKeys = ['education', 'workExperiences', 'projects', 'certifications', 'openSourceContributions', 'stackAndTools', 'mySetup'] as const;
    let currentProfile: ProfileSections | null = null;
    if (profileSectionKeys.some((k) => updates[k] !== undefined)) {
      const doc = await UserModel.findById(user._id).select(profileSectionKeys.join(' ')).lean();
      if (doc) currentProfile = doc as ProfileSections;
    }

    if (typeof updates.username === 'string') {
      const existing = await UserModel.findOne({
        username: updates.username.trim().toLowerCase(),
        _id: { $ne: user._id },
      });
      if (existing) {
        res.status(409).json({ message: 'Username is already taken. Choose another.', success: false });
        return;
      }
      updates.username = (updates.username as string).trim().toLowerCase();
    }

    const workExperiences = updates.workExperiences as Array<{ workId?: string; [k: string]: unknown }> | undefined;
    if (Array.isArray(workExperiences) && workExperiences.length > 0) {
      const current = await UserModel.findById(user._id).select('workExperiences').lean();
      const existingIds = (current?.workExperiences ?? [])
        .map((we: { workId?: string }) => (we.workId ?? '').trim())
        .filter(Boolean)
        .map((id) => parseInt(id, 10))
        .filter((n) => !Number.isNaN(n));
      let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      for (const we of workExperiences) {
        const id = (we.workId ?? '').trim();
        if (!id) {
          we.workId = String(nextNum);
          nextNum += 1;
        } else {
          const n = parseInt(id, 10);
          if (!Number.isNaN(n) && n >= nextNum) nextNum = n + 1;
        }
      }
      updates.workExperiences = workExperiences;
    }

    const education = updates.education as Array<{ eduId?: string; refCode?: string; [k: string]: unknown }> | undefined;
    if (Array.isArray(education) && education.length > 0) {
      const current = await UserModel.findById(user._id).select('education').lean();
      const existingIds = (current?.education ?? [])
        .map((ed: { eduId?: string }) => (ed.eduId ?? '').trim())
        .filter(Boolean)
        .map((id) => parseInt(id, 10))
        .filter((n) => !Number.isNaN(n));
      let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      const year = new Date().getFullYear();
      for (const ed of education) {
        const id = (ed.eduId ?? '').trim();
        if (!id) {
          ed.eduId = String(nextNum);
          nextNum += 1;
        } else {
          const n = parseInt(id, 10);
          if (!Number.isNaN(n) && n >= nextNum) nextNum = n + 1;
        }
        ed.refCode = `${year}_EDU_DOC`;
      }
      updates.education = education;
    }

    const certifications = updates.certifications as Array<{ certId?: string; certValType?: string; [k: string]: unknown }> | undefined;
    if (Array.isArray(certifications) && certifications.length > 0) {
      const current = await UserModel.findById(user._id).select('certifications').lean();
      const existingIds = (current?.certifications ?? [])
        .map((c: { certId?: string }) => (c.certId ?? '').trim())
        .filter(Boolean)
        .map((id) => parseInt(id, 10))
        .filter((n) => !Number.isNaN(n));
      let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      const year = new Date().getFullYear();
      const yearSuffix = String(year).slice(-2);
      const baseValType = `A-${yearSuffix}`;

      for (const cert of certifications) {
        const id = (cert.certId ?? '').trim();
        if (!id) {
          cert.certId = String(nextNum);
          nextNum += 1;
        } else {
          const n = parseInt(id, 10);
          if (!Number.isNaN(n) && n >= nextNum) nextNum = n + 1;
        }
        if (!cert.certValType || !String(cert.certValType).trim()) {
          cert.certValType = baseValType;
        }
      }
      updates.certifications = certifications;
    }

    const projects = updates.projects as Array<{ prjLog?: string; [k: string]: unknown }> | undefined;
    if (Array.isArray(projects) && projects.length > 0) {
      const year = new Date().getFullYear();
      const logValue = `${year}_prd_log`;
      for (const p of projects) {
        p.prjLog = logValue;
      }
      updates.projects = projects;
    }

    const updated = await UserModel.findByIdAndUpdate(user._id, updates, {
      new: true,
      runValidators: true,
      projection: { twoFactorSecret: 0, googleToken: 0, githubToken: 0, facebookToken: 0, xToken: 0, appleToken: 0, discordToken: 0 },
    }).lean();

    if (!updated) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }

    const actorId = String(user._id);
    const updatedProfile = updated as ProfileSections & { _id: unknown };
    if (currentProfile) {
      const log = (action: AuditActionName, targetType: string, metadata: Record<string, unknown>) => {
        void writeAuditLog(req, action, { actorId, targetType, targetId: actorId, metadata });
      };
      if (updates.stackAndTools !== undefined) {
        const oldList = (currentProfile.stackAndTools ?? []) as string[];
        const newList = (updatedProfile.stackAndTools ?? []) as string[];
        for (const t of newList) {
          if (!oldList.includes(t)) log(AuditAction.STACK_TOOL_ADDED, 'profile', { tool: t });
        }
        for (const t of oldList) {
          if (!newList.includes(t)) log(AuditAction.STACK_TOOL_REMOVED, 'profile', { tool: t });
        }
      }
      if (updates.education !== undefined) {
        const oldE = (currentProfile.education ?? []) as Array<{ eduId?: string }>;
        const newE = (updatedProfile.education ?? []) as Array<{ eduId?: string }>;
        const oldIds = new Set(oldE.map((e) => (e.eduId ?? '').trim()).filter(Boolean));
        const newIds = new Set(newE.map((e) => (e.eduId ?? '').trim()).filter(Boolean));
        for (const e of newE) {
          const id = (e.eduId ?? '').trim();
          if (!id) continue;
          if (!oldIds.has(id)) log(AuditAction.EDUCATION_ADDED, 'education', { eduId: id, school: (e as { school?: string }).school });
          else {
            const prev = oldE.find((x) => (x.eduId ?? '').trim() === id);
            if (prev && JSON.stringify(prev) !== JSON.stringify(e)) log(AuditAction.EDUCATION_UPDATED, 'education', { eduId: id });
          }
        }
        for (const id of oldIds) {
          if (!newIds.has(id)) log(AuditAction.EDUCATION_REMOVED, 'education', { eduId: id });
        }
      }
      if (updates.workExperiences !== undefined) {
        const oldW = (currentProfile.workExperiences ?? []) as Array<{ workId?: string }>;
        const newW = (updatedProfile.workExperiences ?? []) as Array<{ workId?: string }>;
        const oldIds = new Set(oldW.map((w) => (w.workId ?? '').trim()).filter(Boolean));
        const newIds = new Set(newW.map((w) => (w.workId ?? '').trim()).filter(Boolean));
        for (const w of newW) {
          const id = (w.workId ?? '').trim();
          if (!id) continue;
          if (!oldIds.has(id)) log(AuditAction.WORK_ADDED, 'work', { workId: id, company: (w as { company?: string }).company });
          else {
            const prev = oldW.find((x) => (x.workId ?? '').trim() === id);
            if (prev && JSON.stringify(prev) !== JSON.stringify(w)) log(AuditAction.WORK_UPDATED, 'work', { workId: id });
          }
        }
        for (const id of oldIds) {
          if (!newIds.has(id)) log(AuditAction.WORK_REMOVED, 'work', { workId: id });
        }
      }
      if (updates.certifications !== undefined) {
        const oldC = (currentProfile.certifications ?? []) as Array<{ certId?: string }>;
        const newC = (updatedProfile.certifications ?? []) as Array<{ certId?: string }>;
        const oldIds = new Set(oldC.map((c) => (c.certId ?? '').trim()).filter(Boolean));
        const newIds = new Set(newC.map((c) => (c.certId ?? '').trim()).filter(Boolean));
        for (const c of newC) {
          const id = (c.certId ?? '').trim();
          if (!id) continue;
          if (!oldIds.has(id)) log(AuditAction.CERTIFICATION_ADDED, 'certification', { certId: id, name: (c as { name?: string }).name });
          else {
            const prev = oldC.find((x) => (x.certId ?? '').trim() === id);
            if (prev && JSON.stringify(prev) !== JSON.stringify(c)) log(AuditAction.CERTIFICATION_UPDATED, 'certification', { certId: id });
          }
        }
        for (const id of oldIds) {
          if (!newIds.has(id)) log(AuditAction.CERTIFICATION_REMOVED, 'certification', { certId: id });
        }
      }
      if (updates.projects !== undefined) {
        const oldP = (currentProfile.projects ?? []) as unknown[];
        const newP = (updatedProfile.projects ?? []) as unknown[];
        if (newP.length > oldP.length) {
          for (let i = oldP.length; i < newP.length; i++) {
            const p = newP[i] as { title?: string };
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
            log(AuditAction.PROJECT_UPDATED, 'project', { index: i, title: (newP[i] as { title?: string })?.title });
          }
        }
      }
      if (updates.openSourceContributions !== undefined) {
        const oldO = (currentProfile.openSourceContributions ?? []) as Array<{ repositoryUrl?: string; title?: string }>;
        const newO = (updatedProfile.openSourceContributions ?? []) as Array<{ repositoryUrl?: string; title?: string }>;
        const oldKeys = new Set(oldO.map((o, i) => (o.repositoryUrl ?? '').trim() || `i:${i}`));
        const newKeys = new Set(newO.map((o, i) => (o.repositoryUrl ?? '').trim() || `i:${i}`));
        for (let i = 0; i < newO.length; i++) {
          const o = newO[i];
          const key = (o.repositoryUrl ?? '').trim() || `i:${i}`;
          if (!oldKeys.has(key)) log(AuditAction.OPEN_SOURCE_ADDED, 'open_source', { repositoryUrl: o.repositoryUrl, title: o.title });
          else {
            const prev = oldO.find((x, j) => ((x.repositoryUrl ?? '').trim() || `i:${j}`) === key);
            if (prev && JSON.stringify(prev) !== JSON.stringify(o)) log(AuditAction.OPEN_SOURCE_UPDATED, 'open_source', { repositoryUrl: o.repositoryUrl, title: o.title });
          }
        }
        for (let i = 0; i < oldO.length; i++) {
          const key = (oldO[i].repositoryUrl ?? '').trim() || `i:${i}`;
          if (!newKeys.has(key)) log(AuditAction.OPEN_SOURCE_REMOVED, 'open_source', { repositoryUrl: oldO[i].repositoryUrl, title: oldO[i].title });
        }
      }
      if (updates.mySetup !== undefined) {
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
    }
    if (Object.keys(updates).length > 0) {
      void writeAuditLog(req, AuditAction.PROFILE_UPDATED, { actorId, targetType: 'profile', targetId: actorId, metadata: { keys: Object.keys(updates) } });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: updated._id,
        fullName: updated.fullName,
        username: updated.username,
        email: updated.email,
        profileImg: normalizeProfileImg(updated.profileImg),
        coverBanner: updated.coverBanner,
        bio: updated.bio,
        job: updated.job,
        portfolioUrl: (updated as any).portfolioUrl,
        linkedin: updated.linkedin,
        instagram: updated.instagram,
        github: updated.github,
        youtube: updated.youtube,
        stackAndTools: updated.stackAndTools,
        workExperiences: updated.workExperiences,
        education: updated.education,
        certifications: updated.certifications,
        projects: updated.projects,
        openSourceContributions: updated.openSourceContributions,
        mySetup: (updated as any).mySetup,
      },
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      res.status(409).json({ message: 'Username is already taken. Choose another.', success: false });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

/** Parse CV/Resume PDF and return extracted profile data + missing fields. Does not update user. */
export async function parseCv(req: Request, res: Response): Promise<void> {
  try {
    const file = (req as Request & { file?: Express.Multer.File & { buffer?: Buffer } }).file;
    const buffer = file?.buffer ?? (file as unknown as { buffer?: Buffer })?.buffer;
    if (!buffer) {
      res.status(400).json({ success: false, message: 'No PDF file uploaded' });
      return;
    }
    const pdfParse = (await import('pdf-parse')).default as (buf: Buffer) => Promise<{ text: string }>;
    const { text } = await pdfParse(buffer);
    const { parseCvFromText } = await import('../../../utils/parseCvFromPdf');
    const { extracted, missingFields, incompleteItemHints } = parseCvFromText(text ?? '');
    res.status(200).json({
      success: true,
      extracted,
      missingFields,
      incompleteItemHints: incompleteItemHints ?? {},
    });
  } catch (err) {
    console.error('parseCv error:', err);
    res.status(500).json({
      success: false,
      message: (err as Error).message || 'Failed to parse PDF',
    });
  }
}
