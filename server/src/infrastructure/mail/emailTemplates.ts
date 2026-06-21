const BRAND_LOGO_URL =
  "https://res.cloudinary.com/dr2bxpjjz/image/upload/v1782036246/favicon-96x96_ds7pim.png";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function footerHtml(label: string): string {
  return `
            <tr>
              <td align="center" style="padding:20px 12px 0 12px;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase;color:#c7c3e6;">
                  &copy; ${new Date().getFullYear()} Syntax_Stories_Corp // All_Rights_Reserved
                </p>
                <p style="margin:8px 0 0 0;font-size:11px;line-height:1.5;color:#8f8aa8;">
                  ${escapeHtml(label)}
                </p>
              </td>
            </tr>`;
}

type EmailLayoutInput = {
  kicker: string;
  title: string;
  bodyHtml: string;
  footerNoteHtml?: string;
  footerLabel: string;
  previewText?: string;
};

export function syntaxStoriesEmailLayout(input: EmailLayoutInput): string {
  const footerNote = input.footerNoteHtml
    ? `
                  <tr>
                    <td style="padding:18px 22px 26px 22px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px dashed #d1d5db;">
                        <tr>
                          <td style="padding-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">
                            ${input.footerNoteHtml}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)} | Syntax Stories</title>
  </head>
  <body style="margin:0;padding:0;background:#0f1117;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(input.previewText ?? input.title)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#0f1117;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse;">
            <tr>
              <td style="border:3px solid #111827;background:#ffffff;box-shadow:7px 7px 0 #000000;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-bottom:3px solid #111827;background:#5f4fe6;padding:14px 18px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width:44px;vertical-align:middle;">
                            <img
                              src="${BRAND_LOGO_URL}"
                              width="40"
                              alt="Syntax Stories"
                              style="display:block;width:40px;height:40px;border:2px solid #111827;outline:none;text-decoration:none;background:#ffffff;"
                            />
                          </td>
                          <td style="vertical-align:middle;padding-left:12px;">
                            <p style="margin:0 0 5px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#f6d84f;">
                              ${escapeHtml(input.kicker)}
                            </p>
                            <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.05;font-weight:900;letter-spacing:-1px;text-transform:uppercase;color:#ffffff;">
                              ${escapeHtml(input.title)}
                            </h1>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 22px 8px 22px;font-family:Arial,Helvetica,sans-serif;">
                      ${input.bodyHtml}
                    </td>
                  </tr>
                  ${footerNote}
                </table>
              </td>
            </tr>
            ${footerHtml(input.footerLabel)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraphHtml(text: string): string {
  return `<p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#374151;">${escapeHtml(text)}</p>`;
}

function codeBoxHtml(label: string, code: string): string {
  return `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border-collapse:collapse;">
                        <tr>
                          <td align="center" style="border:3px solid #111827;background:#f6d84f;padding:20px 12px;box-shadow:5px 5px 0 #111827;">
                            <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#111827;">
                              ${escapeHtml(label)}
                            </p>
                            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:42px;line-height:1;font-weight:900;letter-spacing:10px;color:#111827;">
                              ${escapeHtml(code)}
                            </p>
                          </td>
                        </tr>
                      </table>`;
}

function noticeHtml(html: string, tone: "info" | "danger" = "info"): string {
  const border = tone === "danger" ? "#dc2626" : "#5f4fe6";
  const bg = tone === "danger" ? "#fef2f2" : "#f4f2ff";
  const color = tone === "danger" ? "#7f1d1d" : "#312e81";
  return `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="border-left:5px solid ${border};background:${bg};padding:14px 16px;">
                            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${color};">
                              ${html}
                            </p>
                          </td>
                        </tr>
                      </table>`;
}

function ctaHtml(label: string, href: string): string {
  return `<p style="margin:22px 0 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;border:3px solid #111827;background:#f6d84f;color:#111827;padding:11px 15px;box-shadow:4px 4px 0 #111827;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;">${escapeHtml(label)}</a></p>`;
}

type OtpEmailInput = {
  title: string;
  intro: string;
  codeLabel: string;
  code: string;
  ttlMin: number;
  notice: string;
  footerNote: string;
  kicker?: string;
  footerLabel?: string;
};

export function buildOtpEmail(input: OtpEmailInput): string {
  return syntaxStoriesEmailLayout({
    kicker: input.kicker ?? "Syntax Stories Verification",
    title: input.title,
    previewText: `${input.codeLabel}: ${input.code}. Expires in ${input.ttlMin} minutes.`,
    bodyHtml: `
                      ${paragraphHtml(input.intro)}
                      ${codeBoxHtml(input.codeLabel, input.code)}
                      ${noticeHtml(`${escapeHtml(input.notice)} <strong>${input.ttlMin} minutes</strong>.`)}`,
    footerNoteHtml: `<strong style="color:#111827;">Security tip:</strong> ${escapeHtml(input.footerNote)}`,
    footerLabel: input.footerLabel ?? "Transactional account email.",
  });
}

export function buildPaymentFailedEmail(portalUrl?: string): string {
  return syntaxStoriesEmailLayout({
    kicker: "Billing Notice",
    title: "Payment Failed",
    previewText: "Payment failed. Update your billing method to keep your plan active.",
    bodyHtml: `
                      ${paragraphHtml("We could not process a payment for your Syntax Stories subscription.")}
                      ${noticeHtml("Please update your payment method in the billing portal to keep your plan active.", "danger")}
                      ${portalUrl ? ctaHtml("Open Billing Portal", portalUrl) : ""}`,
    footerNoteHtml:
      '<strong style="color:#111827;">Billing note:</strong> This is a service notice about your subscription status.',
    footerLabel: "Transactional billing email.",
  });
}

type ModerationEmailInput = {
  authorName: string;
  postTitle: string;
  action: "deleted" | "suspended";
  settingsUrl: string;
};

export function buildBlogModerationEmail(input: ModerationEmailInput): string {
  const removed = input.action === "deleted";
  const actionCopy = removed
    ? "was removed by the Syntax Stories moderation team."
    : "was suspended by the Syntax Stories moderation team.";
  const noticeCopy = removed
    ? "It is no longer visible on the platform. You can contact support if you believe this was a mistake."
    : "It is hidden from public feeds and search. You may edit the post and republish when ready, or contact support for help.";
  return syntaxStoriesEmailLayout({
    kicker: "Content Moderation",
    title: removed ? "Post Removed" : "Post Suspended",
    previewText: `Your post ${removed ? "was removed" : "was suspended"}: ${input.postTitle}`,
    bodyHtml: `
                      ${paragraphHtml(`Hi ${input.authorName || "there"}, your blog post "${input.postTitle || "Untitled"}" ${actionCopy}`)}
                      ${noticeHtml(escapeHtml(noticeCopy), removed ? "danger" : "info")}
                      ${ctaHtml("Open Account Settings", input.settingsUrl)}`,
    footerNoteHtml:
      '<strong style="color:#111827;">Review note:</strong> This message helps authors understand moderation actions on their content.',
    footerLabel: "Transactional moderation email.",
  });
}

export function buildFeedbackNotificationEmail(input: {
  rows: { k: string; v: string }[];
  description: string;
  clientMetaJson?: string;
}): string {
  const rows = input.rows
    .map(
      ({ k, v }) =>
        `<p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#374151;"><strong style="color:#111827;">${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`,
    )
    .join("");
  const meta = input.clientMetaJson
    ? `<div style="margin-top:14px;border:2px dashed #d1d5db;background:#f9fafb;padding:14px 16px;"><p style="margin:0 0 8px 0;font-size:13px;font-weight:900;color:#111827;">Client metadata</p><pre style="margin:0;white-space:pre-wrap;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.5;color:#374151;">${escapeHtml(input.clientMetaJson)}</pre></div>`
    : "";
  return syntaxStoriesEmailLayout({
    kicker: "Feedback Inbox",
    title: "New Feedback",
    previewText: "A new Syntax Stories feedback submission was received.",
    bodyHtml: `
                      ${paragraphHtml("A new user feedback submission was received.")}
                      <div style="margin:18px 0;border:2px dashed #d1d5db;background:#f9fafb;padding:14px 16px;">${rows}</div>
                      <div style="margin:18px 0;border:2px dashed #d1d5db;background:#f9fafb;padding:14px 16px;">
                        <p style="margin:0 0 8px 0;font-size:13px;font-weight:900;color:#111827;">Message</p>
                        <pre style="margin:0;white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#374151;">${escapeHtml(input.description)}</pre>
                      </div>
                      ${meta}`,
    footerNoteHtml:
      '<strong style="color:#111827;">Admin note:</strong> Reply-to should use the sender email when available.',
    footerLabel: "Transactional admin notification.",
  });
}

export function buildStorageGuardEmail(input: {
  label: string;
  since: string;
  recovery: string;
}): string {
  return syntaxStoriesEmailLayout({
    kicker: "Platform Alert",
    title: "Storage Guard Active",
    previewText: `Storage guard activated: ${input.label}`,
    bodyHtml: `
                      ${paragraphHtml("Syntax Stories storage guard has been activated.")}
                      ${noticeHtml("New public writes/uploads may be temporarily blocked until storage capacity is restored.", "danger")}
                      <div style="margin:18px 0;border:2px dashed #d1d5db;background:#f9fafb;padding:14px 16px;">
                        <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#374151;"><strong style="color:#111827;">Reason:</strong> ${escapeHtml(input.label)}</p>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:#374151;"><strong style="color:#111827;">Since:</strong> ${escapeHtml(input.since)}</p>
                      </div>`,
    footerNoteHtml: `<strong style="color:#111827;">Action:</strong> ${escapeHtml(input.recovery)}`,
    footerLabel: "Transactional platform alert.",
  });
}

export { escapeHtml as escapeEmailHtml };
