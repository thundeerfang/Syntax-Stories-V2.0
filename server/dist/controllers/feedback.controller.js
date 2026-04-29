import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { sendAuthEmail, getEmailSendErrorMessage } from '../infrastructure/mail/sendAuthEmail.js';
import { parseMultipartFeedback } from '../middlewares/feedback/feedbackMultipart.validation.js';
import { UserModel } from '../models/User.js';
import { FeedbackSubmissionModel } from '../models/FeedbackSubmission.js';
import { FeedbackCategoryModel } from '../models/FeedbackCategory.js';
import { formatDateTimeIst, istTimeZoneLabel } from '../utils/ist.js';
import { getDefaultUploadStorage } from '../services/storage/localDiskUploadStorage.js';
import { processUploadedImageBuffer, ImageMasterError } from '../services/image/imageMasterHandler.js';
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function splitFullName(fullName) {
    const t = fullName.trim();
    if (!t)
        return { firstName: 'User', lastName: '—' };
    const parts = t.split(/\s+/);
    const firstName = (parts[0] ?? 'User').slice(0, 80);
    const rest = parts.slice(1).join(' ').trim();
    const lastName = (rest || '—').slice(0, 80);
    return { firstName, lastName };
}
function feedbackNotifyTo() {
    const a = env.FEEDBACK_NOTIFY_EMAIL?.trim();
    if (a)
        return a;
    const b = env.EMAIL_FROM?.trim();
    if (b)
        return b;
    const c = env.EMAIL_USER?.trim();
    if (c)
        return c;
    const d = env.RESEND_FROM?.trim();
    return d || null;
}
function clientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    const raw = typeof xff === 'string'
        ? xff.split(',')[0]?.trim()
        : Array.isArray(xff)
            ? xff[0]?.trim()
            : '';
    if (raw)
        return raw.slice(0, 200);
    const ip = req.ip || req.socket?.remoteAddress;
    return typeof ip === 'string' ? ip.slice(0, 200) : undefined;
}
function forwardedForHeader(req) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string')
        return xff.slice(0, 500);
    if (Array.isArray(xff))
        return xff.join(', ').slice(0, 500);
    return undefined;
}
function uaHeader(req) {
    const ua = req.headers['user-agent'];
    return typeof ua === 'string' ? ua.slice(0, 1024) : undefined;
}
function buildFeedbackEmailHtml(params) {
    const metaJson = params.clientMeta ? JSON.stringify(params.clientMeta, null, 2) : '';
    const rows = [
        { k: 'Submitted (IST)', v: escapeHtml(params.submittedAtIst) },
        { k: 'Category', v: escapeHtml(params.categoryLabel) },
        { k: 'Name', v: escapeHtml(`${params.firstName} ${params.lastName}`) },
        { k: 'Email', v: escapeHtml(params.email) },
        { k: 'Subject', v: escapeHtml(params.subject) },
    ];
    if (params.attachmentUrl) {
        rows.push({ k: 'Attachment', v: escapeHtml(params.attachmentUrl) });
    }
    if (params.attachmentTitle) {
        rows.push({ k: 'Attachment title', v: escapeHtml(params.attachmentTitle) });
    }
    if (params.username)
        rows.push({ k: 'Username', v: escapeHtml(params.username) });
    if (params.userId)
        rows.push({ k: 'User ID', v: escapeHtml(params.userId) });
    if (params.ip)
        rows.push({ k: 'IP', v: escapeHtml(params.ip) });
    if (params.forwardedFor)
        rows.push({ k: 'X-Forwarded-For', v: escapeHtml(params.forwardedFor) });
    if (params.userAgent)
        rows.push({ k: 'User-Agent', v: escapeHtml(params.userAgent) });
    const tableRows = rows
        .map(({ k, v }) => `<tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;width:180px;">${k}</td><td style="padding:8px;border:1px solid #ccc;">${v}</td></tr>`)
        .join('');
    const desc = `<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;padding:12px;background:#f5f5f5;border:1px solid #ccc;">${escapeHtml(params.description)}</pre>`;
    const clientBlock = metaJson
        ? `<h3>Client metadata</h3><pre style="white-space:pre-wrap;font-size:12px;">${escapeHtml(metaJson)}</pre>`
        : '';
    return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;">
<h2>New feedback — Syntax Stories</h2>
<table style="border-collapse:collapse;margin-bottom:16px;">${tableRows}</table>
<h3>Message</h3>
${desc}
${clientBlock}
</body></html>`;
}
/** GET /api/feedback/categories */
export async function listFeedbackCategories(_req, res) {
    try {
        const rows = await FeedbackCategoryModel.find({ active: true })
            .sort({ sortOrder: 1, label: 1 })
            .select('_id slug label sortOrder active isSystemSeed createdByLabel updatedByLabel createdAtIst updatedAtIst')
            .lean();
        const categories = rows.map((c) => ({
            id: String(c._id),
            slug: c.slug,
            label: c.label,
            sortOrder: c.sortOrder,
            active: c.active,
            isSystemSeed: c.isSystemSeed,
            createdByLabel: c.createdByLabel,
            updatedByLabel: c.updatedByLabel,
            createdAtIst: c.createdAtIst,
            updatedAtIst: c.updatedAtIst,
        }));
        res.status(200).json({ success: true, categories });
    }
    catch (err) {
        console.error('[feedback] listFeedbackCategories', err);
        res.status(500).json({ success: false, message: 'Could not load categories.' });
    }
}
/** POST /api/feedback (multipart: fields + optional attachment) */
export async function submitFeedback(req, res) {
    try {
        const r = req;
        const auth = r.authUser;
        const isAuthed = Boolean(auth?._id);
        const parsed = parseMultipartFeedback(req.body, isAuthed);
        if (!parsed.ok) {
            res.status(400).json({ success: false, message: parsed.message });
            return;
        }
        const category = await FeedbackCategoryModel.findOne({
            _id: new mongoose.Types.ObjectId(parsed.data.categoryId),
            active: true,
        })
            .select('slug label')
            .lean();
        if (!category) {
            res.status(400).json({ success: false, message: 'Invalid or inactive category.' });
            return;
        }
        const submittedAtIst = formatDateTimeIst();
        const ip = clientIp(req);
        const forwardedFor = forwardedForHeader(req);
        const userAgent = uaHeader(req);
        const istTimeZone = istTimeZoneLabel();
        let firstName;
        let lastName;
        let email;
        let subject = parsed.data.subject;
        let description = parsed.data.description;
        let clientMeta = parsed.data.clientMeta;
        let username;
        let userId;
        if (isAuthed) {
            const u = await UserModel.findById(auth._id).select('fullName email username').lean();
            if (!u) {
                res.status(401).json({ success: false, message: 'Session invalid. Please sign in again.' });
                return;
            }
            const split = splitFullName(typeof u.fullName === 'string' ? u.fullName : '');
            firstName = split.firstName;
            lastName = split.lastName;
            email = typeof u.email === 'string' ? u.email : '';
            if (!email) {
                res.status(400).json({ success: false, message: 'Account email missing.' });
                return;
            }
            username = typeof u.username === 'string' ? u.username : undefined;
            userId = new mongoose.Types.ObjectId(auth._id);
        }
        else {
            firstName = parsed.data.firstName;
            lastName = parsed.data.lastName;
            email = parsed.data.email.toLowerCase();
        }
        const attachmentTitleRaw = parsed.data.attachmentTitle?.trim();
        const attachmentTitle = attachmentTitleRaw && attachmentTitleRaw.length > 0 ? attachmentTitleRaw.slice(0, 120) : undefined;
        const mReq = req;
        let attachmentUrl;
        let attachmentMeta;
        if (mReq.file?.buffer?.length) {
            try {
                const processed = await processUploadedImageBuffer(mReq.file.buffer, mReq.file.mimetype, 'feedback');
                const dir = getDefaultUploadStorage().dirs.feedback;
                await fs.mkdir(dir, { recursive: true });
                const base = `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`;
                const diskPath = path.join(dir, base);
                await fs.writeFile(diskPath, processed.buffer);
                attachmentUrl = `/uploads/feedback/${base}`;
                attachmentMeta = {
                    mime: processed.mime,
                    width: processed.width,
                    height: processed.height,
                    bytesIn: processed.bytesIn,
                    bytesOut: processed.bytesOut,
                    originalName: mReq.file.originalname?.slice(0, 255),
                };
            }
            catch (e) {
                if (e instanceof ImageMasterError) {
                    const status = e.code === 'virus' ? 422 : e.code === 'clamav_config' ? 503 : 400;
                    res.status(status).json({ success: false, message: e.message });
                    return;
                }
                throw e;
            }
        }
        const serverMeta = {
            submittedAtIst,
            ip,
            forwardedFor,
            userAgent,
            istTimeZone,
        };
        const doc = await FeedbackSubmissionModel.create({
            firstName,
            lastName,
            email,
            subject,
            description,
            categoryId: new mongoose.Types.ObjectId(parsed.data.categoryId),
            categorySlug: category.slug,
            categoryLabel: category.label,
            userId,
            username,
            clientMeta,
            serverMeta,
            emailDelivered: false,
            attachmentUrl,
            attachmentTitle: attachmentUrl ? attachmentTitle : undefined,
            attachmentMeta,
        });
        const to = feedbackNotifyTo();
        let emailDelivered = false;
        let emailError;
        if (to) {
            const html = buildFeedbackEmailHtml({
                firstName,
                lastName,
                email,
                subject,
                description,
                categoryLabel: category.label,
                attachmentUrl,
                attachmentTitle: attachmentUrl ? attachmentTitle : undefined,
                username,
                userId: userId ? String(userId) : undefined,
                submittedAtIst,
                ip,
                forwardedFor,
                userAgent,
                clientMeta,
            });
            const mailSubject = `[Feedback] ${category.label} — ${subject.slice(0, 100)}`;
            try {
                await sendAuthEmail({ to, subject: mailSubject, html, replyTo: email });
                emailDelivered = true;
            }
            catch (e) {
                emailError = getEmailSendErrorMessage(e);
                console.error('[feedback] notify email failed:', e);
            }
        }
        else {
            emailError = 'No FEEDBACK_NOTIFY_EMAIL / EMAIL_FROM / EMAIL_USER configured.';
        }
        doc.emailDelivered = emailDelivered;
        if (emailError)
            doc.emailError = emailError;
        await doc.save();
        res.status(201).json({
            success: true,
            message: 'Thanks — your feedback was received.',
            emailSent: emailDelivered,
        });
    }
    catch (err) {
        console.error('[feedback] submitFeedback', err);
        res.status(500).json({ success: false, message: 'Could not save feedback. Please try again later.' });
    }
}
//# sourceMappingURL=feedback.controller.js.map