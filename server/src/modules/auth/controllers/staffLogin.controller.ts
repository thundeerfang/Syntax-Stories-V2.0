import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../../../models/User.js';
import { AdminUserModel } from '../../admin/models/AdminUser.js';
import { respondWithSessionAfterEmailAuth } from '../../../services/authLogin.service.js';

/**
 * Password sign-in: `admin_users` credential first, else legacy `users.staffPasswordHash` for staff.
 */
export async function staffLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const emailNorm = String(email ?? '')
      .trim()
      .toLowerCase();

    const adminRow = await AdminUserModel.findOne({ email: emailNorm }).select('+passwordHash');
    if (adminRow) {
      if (!adminRow.isActive) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }
      const okAdmin = await bcrypt.compare(password, adminRow.passwordHash);
      if (!okAdmin) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }
      const user = await UserModel.findById(adminRow.userId);
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }
      await respondWithSessionAfterEmailAuth(req, res, user, false, { loginSource: 'staff_password' });
      return;
    }

    const user = await UserModel.findOne({ email: emailNorm }).select('+staffPasswordHash');
    if (!user?.staffRole || (user.staffRole !== 'editor' && user.staffRole !== 'admin')) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }
    const hash = user.staffPasswordHash;
    if (!hash) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }
    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }
    await respondWithSessionAfterEmailAuth(req, res, user, false, { loginSource: 'staff_password' });
  } catch (e) {
    console.error('[staffLogin]', e);
    res.status(500).json({ success: false, message: 'Internal Server Error 💀' });
  }
}
