import { env } from "../../../config/env.js";
import { sendAuthEmail } from "../../../infrastructure/mail/sendAuthEmail.js";
import { buildBlogModerationEmail } from "../../../infrastructure/mail/emailTemplates.js";
function webappBase(): string {
  return (env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
export async function sendBlogModerationEmail(opts: {
  to: string;
  authorName: string;
  postTitle: string;
  action: "deleted" | "suspended";
}): Promise<void> {
  const title = opts.postTitle || "Blog post";
  const base = webappBase();
  const subject =
    opts.action === "deleted"
      ? `Your post was removed: ${title}`
      : `Your post was suspended: ${title}`;
  try {
    await sendAuthEmail({
      to: opts.to,
      subject,
      html: buildBlogModerationEmail({
        authorName: opts.authorName || "there",
        postTitle: title,
        action: opts.action,
        settingsUrl: `${base}/settings`,
      }),
    });
  } catch (e) {
    console.warn("[blogModeration] author email failed:", (e as Error).message);
  }
}
