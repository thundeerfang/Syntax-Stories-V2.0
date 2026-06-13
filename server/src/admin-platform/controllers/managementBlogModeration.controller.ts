import type { Request, Response } from 'express';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';
import {
  adminRestoreBlog,
  adminSoftDeleteBlog,
  adminSuspendBlog,
  adminUnsuspendBlog,
  BlogModerationError,
} from '../cms/blog/blogModeration.service.js';

function actorId(req: StaffManagementRequest): string {
  return req.user._id;
}

export async function deleteBlogAsAdmin(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  try {
    const data = await adminSoftDeleteBlog(id, actorId(req as StaffManagementRequest), req);
    sendAdminOk(res, data);
  } catch (e) {
    if (e instanceof BlogModerationError) {
      sendAdminError(res, e.status, e.code, e.message);
      return;
    }
    throw e;
  }
}

export async function suspendBlogAsAdmin(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  try {
    const data = await adminSuspendBlog(id, actorId(req as StaffManagementRequest), req);
    sendAdminOk(res, data);
  } catch (e) {
    if (e instanceof BlogModerationError) {
      sendAdminError(res, e.status, e.code, e.message);
      return;
    }
    throw e;
  }
}

export async function unsuspendBlogAsAdmin(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  try {
    const data = await adminUnsuspendBlog(id, actorId(req as StaffManagementRequest), req);
    sendAdminOk(res, data);
  } catch (e) {
    if (e instanceof BlogModerationError) {
      sendAdminError(res, e.status, e.code, e.message);
      return;
    }
    throw e;
  }
}

export async function restoreBlogAsAdmin(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  try {
    const data = await adminRestoreBlog(id, actorId(req as StaffManagementRequest), req);
    sendAdminOk(res, data);
  } catch (e) {
    if (e instanceof BlogModerationError) {
      sendAdminError(res, e.status, e.code, e.message);
      return;
    }
    throw e;
  }
}
