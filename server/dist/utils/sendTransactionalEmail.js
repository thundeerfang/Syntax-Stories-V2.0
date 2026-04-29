"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usesEmailApi = usesEmailApi;
exports.isEmailTransportConfigured = isEmailTransportConfigured;
exports.sendTransactionalEmail = sendTransactionalEmail;
exports.getEmailSendErrorMessage = getEmailSendErrorMessage;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
let smtpTransporter = null;
function getDefaultFrom() {
    return env_1.env.EMAIL_FROM || env_1.env.EMAIL_USER || 'noreply@syntaxstories.com';
}
/** True when using REST email (API key + header) instead of SMTP. */
function usesEmailApi() {
    return !!(env_1.env.EMAIL_API_URL && env_1.env.EMAIL_API_KEY);
}
function isEmailTransportConfigured() {
    if (usesEmailApi()) {
        return !!getDefaultFrom();
    }
    return !!(env_1.env.EMAIL_HOST &&
        env_1.env.EMAIL_USER &&
        (env_1.env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS));
}
function getSmtpTransporter() {
    if (!smtpTransporter) {
        smtpTransporter = nodemailer_1.default.createTransport({
            host: env_1.env.EMAIL_HOST,
            port: env_1.env.EMAIL_PORT,
            secure: env_1.env.EMAIL_PORT === 465,
            auth: {
                user: env_1.env.EMAIL_USER,
                pass: env_1.env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS,
            },
        });
    }
    return smtpTransporter;
}
function buildApiHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
    const key = env_1.env.EMAIL_API_KEY;
    if (env_1.env.EMAIL_API_AUTH === 'header') {
        const name = env_1.env.EMAIL_API_HEADER_NAME || 'X-API-Key';
        headers[name] = key;
    }
    else {
        headers.Authorization = `Bearer ${key}`;
    }
    return headers;
}
async function sendViaHttpApi(params) {
    const url = env_1.env.EMAIL_API_URL;
    const body = JSON.stringify({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
    });
    const res = await fetch(url, {
        method: 'POST',
        headers: buildApiHeaders(),
        body,
    });
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    }
    catch {
        // non-JSON body
    }
    if (!res.ok) {
        const detail = json?.message ?? (text || res.statusText);
        throw new Error(`Email API error (${res.status}): ${detail}`);
    }
    if (json && typeof json.result === 'string' && json.result !== 'success') {
        throw new Error(json.message ?? `Email API returned result: ${json.result}`);
    }
}
/**
 * Sends one transactional message. Prefers HTTP API when EMAIL_API_URL + EMAIL_API_KEY are set; otherwise SMTP.
 */
async function sendTransactionalEmail(opts) {
    const from = opts.from ?? getDefaultFrom();
    if (usesEmailApi()) {
        await sendViaHttpApi({
            from,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
        });
        return;
    }
    await getSmtpTransporter().sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
    });
}
function getEmailSendErrorMessage(err) {
    const code = err?.code;
    if (code === 'EAUTH') {
        return 'Email not configured. For Gmail SMTP, use an App Password (see https://support.google.com/mail/?p=InvalidSecondFactor) and set EMAIL_APP_PASSWORD in .env. Or use EMAIL_API_URL + EMAIL_API_KEY for an HTTP email API.';
    }
    return err?.message ?? 'Failed to send email.';
}
//# sourceMappingURL=sendTransactionalEmail.js.map