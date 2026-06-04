import { Router } from 'express';
import { UserModel } from '../../models/User.js';
import { AdminUserModel } from '../rbac/models/AdminUser.js';
import { env } from '../../config/env.js';
import { respondWithSessionAfterEmailAuth } from '../../services/authLogin.service.js';
import {
  extractEmailFromSamlResponseBase64,
  samlLoginRedirectUrl,
  samlMetadataXml,
} from './saml.service.js';
import { resolveStaffRoleForUser } from '../rbac/services/adminStaffResolution.js';

export const samlAdminRouter = Router();

samlAdminRouter.get('/metadata', (req, res) => {
  if (!env.FEATURE_SAML_SSO) {
    res.status(503).json({ success: false, message: 'SAML SSO is not enabled' });
    return;
  }
  const origin = `${req.protocol}://${req.get('host')}`;
  res.type('application/xml').send(samlMetadataXml(origin));
});

samlAdminRouter.get('/login', (req, res) => {
  if (!env.FEATURE_SAML_SSO) {
    res.status(503).json({ success: false, message: 'SAML SSO is not enabled' });
    return;
  }
  const url = samlLoginRedirectUrl();
  if (!url) {
    res.status(503).json({
      success: false,
      message: 'Set SAML_IDP_SSO_URL to redirect operators to your IdP.',
    });
    return;
  }
  res.redirect(url);
});

samlAdminRouter.post('/acs', async (req, res, next) => {
  try {
    if (!env.FEATURE_SAML_SSO) {
      res.status(503).json({ success: false, message: 'SAML SSO is not enabled' });
      return;
    }

    const body = req.body as { SAMLResponse?: string; email?: string };
    let email: string | null = null;

    if (env.FEATURE_SAML_DEV_ACS && body.email) {
      email = body.email.trim().toLowerCase();
    } else if (body.SAMLResponse) {
      email = extractEmailFromSamlResponseBase64(body.SAMLResponse);
    }

    if (!email) {
      res.status(400).json({
        success: false,
        message:
          'Could not parse SAML assertion. Configure IdP signing or enable FEATURE_SAML_DEV_ACS for testing.',
      });
      return;
    }

    const adminRow = await AdminUserModel.findOne({ email, isActive: true });
    if (!adminRow) {
      res.status(403).json({ success: false, message: 'No active operator for this email' });
      return;
    }

    const user = await UserModel.findById(adminRow.userId);
    if (!user) {
      res.status(403).json({ success: false, message: 'Operator account not found' });
      return;
    }

    const staffRole = await resolveStaffRoleForUser(String(user._id));
    if (!staffRole) {
      res.status(403).json({ success: false, message: 'Not a staff account' });
      return;
    }

    await respondWithSessionAfterEmailAuth(req, res, user, false, {
      loginSource: 'staff_password',
    });
  } catch (e) {
    next(e);
  }
});
