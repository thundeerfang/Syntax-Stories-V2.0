import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { SessionModel } from '../../../models/Session.js';
import { SecurityEventModel } from '../../../models/SecurityEvent.js';
import type { AuthUser } from '../../../middlewares/auth/index.js';
import { writeAuditLog } from '../../../shared/audit/auditLog.js';
import { AuditAction } from '../../../shared/audit/events.js';
import { logSecurityEvent } from '../securityEventLog.js';
import { hashToken } from '../../../services/session.service.js';
import {
  refreshSessionWithRotation,
  sendRefreshSuccess,
} from '../../../services/sessionRefresh.service.js';
import { env } from '../../../config/env.js';
import { readAdminRefreshToken } from '../../../admin-platform/auth/adminSessionCookies.js';

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as { refreshToken?: string };
    let refreshTokenRaw = body.refreshToken;
    if (!refreshTokenRaw && env.FEATURE_ADMIN_HTTPONLY_COOKIES) {
      refreshTokenRaw = readAdminRefreshToken(req.cookies ?? {}) ?? undefined;
    }
    if (!refreshTokenRaw) {
      res.status(400).json({ message: 'Refresh token required', success: false });
      return;
    }

    const result = await refreshSessionWithRotation(req, refreshTokenRaw);
    if (!result.ok) {
      res.status(result.status).json({ message: result.message, success: false });
      return;
    }

    sendRefreshSuccess(res, result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    const body = req.body as { sessionId?: string; refreshToken?: string };
    const sessionId = body.sessionId ?? user?.sessionId;
    const refreshToken = body.refreshToken;

    async function revokeOne(session: InstanceType<typeof SessionModel> | null): Promise<void> {
      if (!session || session.revoked || !user?._id) return;
      session.revoked = true;
      await session.save();
      const sid = String(session._id);
      await logSecurityEvent(user._id, 'session_revoked', req, { sessionId: sid });
      void writeAuditLog(req, AuditAction.USER_SIGNOUT, {
        actorId: String(user._id),
        metadata: { sessionId: sid },
      });
      void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
        actorId: String(user._id),
        metadata: { sessionId: sid },
      });
    }

    if (user?._id && sessionId) {
      const byId = await SessionModel.findOne({ _id: sessionId, userId: user._id });
      await revokeOne(byId);
    }
    if (user?._id && refreshToken) {
      const refreshTokenHash = hashToken(refreshToken);
      const byRt = await SessionModel.findOne({ refreshTokenHash, userId: user._id });
      await revokeOne(byRt);
    }

    res.status(200).json({ message: 'Logged out successfully 👋', success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

/** Revoke session by refresh token only (no JWT). Use when token expired and client clears state. */
export async function revokeSessionByRefreshToken(req: Request, res: Response): Promise<void> {
  try {
    const refreshTokenRaw = (req.body as { refreshToken?: string }).refreshToken;
    if (!refreshTokenRaw || typeof refreshTokenRaw !== 'string') {
      res.status(400).json({ message: 'refreshToken required', success: false });
      return;
    }
    const refreshTokenHash = hashToken(refreshTokenRaw);
    const session = await SessionModel.findOne({ refreshTokenHash });
    if (session) {
      session.revoked = true;
      await session.save();
      await logSecurityEvent(String(session.userId), 'session_revoked', req, {
        sessionId: session._id,
      });
      void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
        actorId: String(session.userId),
        metadata: { sessionId: String(session._id) },
      });
    }
    res.status(200).json({ message: 'Session revoked', success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const limitRaw = (req.query.limit as string | undefined) ?? '20';
    const limit = Math.max(1, Math.min(Number.parseInt(limitRaw, 10) || 20, 50));
    const sessions = await SessionModel.find({
      userId: user._id,
      revoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      sessions: sessions.map((s) => ({
        _id: s._id,
        deviceName: s.deviceName,
        ip: s.ip,
        userAgent: s.userAgent,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const { sessionId } = req.params as { sessionId?: string };
    if (!sessionId) {
      res.status(400).json({ message: 'Session ID required', success: false });
      return;
    }

    const session = await SessionModel.findOne({ _id: sessionId, userId: user._id });
    if (!session || session.revoked) {
      res.status(404).json({ message: 'Session not found', success: false });
      return;
    }

    session.revoked = true;
    await session.save();
    await logSecurityEvent(String(user._id), 'session_revoked', req, { sessionId });
    void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
      actorId: String(user._id),
      metadata: { sessionId },
    });

    res.status(200).json({ success: true, message: 'Session revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    await SessionModel.updateMany(
      { userId: user._id, revoked: false },
      { $set: { revoked: true } }
    );
    await logSecurityEvent(String(user._id), 'session_revoked', req, { scope: 'all' });
    void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
      actorId: String(user._id),
      metadata: { scope: 'all' },
    });

    res.status(200).json({ success: true, message: 'All sessions revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function logoutOthers(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id || !user.sessionId) {
      res.status(400).json({ message: 'Current session information missing', success: false });
      return;
    }

    await SessionModel.updateMany(
      { userId: user._id, _id: { $ne: user.sessionId }, revoked: false },
      { $set: { revoked: true } }
    );
    await logSecurityEvent(String(user._id), 'session_revoked', req, { scope: 'others' });
    void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
      actorId: String(user._id),
      metadata: { scope: 'others' },
    });

    res.status(200).json({ success: true, message: 'Other sessions revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function listSecurityEvents(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const limitRaw = (req.query.limit as string | undefined) ?? '20';
    const limit = Math.max(1, Math.min(Number.parseInt(limitRaw, 10) || 20, 50));

    const events = await SecurityEventModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      events: events.map((e) => ({
        _id: e._id,
        type: e.type,
        ip: e.ip,
        userAgent: e.userAgent,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}
