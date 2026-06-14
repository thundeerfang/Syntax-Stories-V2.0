import { env } from "../../../config/env.js";
import { sendAuthEmail } from "../../../infrastructure/mail/sendAuthEmail.js";
function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function webappBase(): string {
  return (env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
export async function sendBlogModerationEmail(opts: {
  to: string;
  authorName: string;
  postTitle: string;
  action: "deleted" | "suspended";
}): Promise<void> {
  const title = escapeHtml(opts.postTitle || "Untitled");
  const name = escapeHtml(opts.authorName || "there");
  const base = webappBase();
  const body =
    opts.action === "deleted"
      ? `
        <p>Hi ${name},</p>
        <p>Your blog post <strong>${title}</strong> was removed by the Syntax Stories moderation team.</p>
        <p>It is no longer visible on the platform. You can contact support if you believe this was a mistake.</p>
        <p><a href="${base}/settings">Account settings</a></p>
      `
      : `
        <p>Hi ${name},</p>
        <p>Your blog post <strong>${title}</strong> was <strong>suspended</strong> by the Syntax Stories moderation team.</p>
        <p>It is hidden from public feeds and search. Only you can still view it while signed in to your account.</p>
        <p>You may edit the post and republish when ready, or contact support for help.</p>
        <p><a href="${base}/settings">Account settings</a></p>
      `;
  const subject =
    opts.action === "deleted"
      ? `Your post was removed: ${opts.postTitle || "Blog post"}`
      : `Your post was suspended: ${opts.postTitle || "Blog post"}`;
  try {
    await sendAuthEmail({
      to: opts.to,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">${body}</div>`,
    });
  } catch (e) {
    console.warn("[blogModeration] author email failed:", (e as Error).message);
  }
}
