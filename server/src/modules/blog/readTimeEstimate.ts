const WORDS_PER_MINUTE = 200;
function collectTextFromProseDoc(node: unknown, out: string[]): void {
  if (node == null || typeof node !== "object") return;
  const n = node as {
    type?: string;
    text?: string;
    content?: unknown[];
  };
  if (typeof n.text === "string" && n.text) out.push(n.text);
  if (Array.isArray(n.content)) {
    for (const c of n.content) collectTextFromProseDoc(c, out);
  }
}
function appendBlockText(
  type: string,
  payload: Record<string, unknown>,
  chunks: string[],
): void {
  switch (type) {
    case "paragraph": {
      const text = typeof payload.text === "string" ? payload.text : "";
      if (text.trim()) {
        chunks.push(text);
        break;
      }
      if (payload.doc) {
        const fromDoc: string[] = [];
        collectTextFromProseDoc(payload.doc, fromDoc);
        if (fromDoc.length) chunks.push(fromDoc.join(" "));
      }
      break;
    }
    case "heading": {
      if (typeof payload.text === "string" && payload.text.trim())
        chunks.push(payload.text);
      break;
    }
    case "code": {
      if (typeof payload.code === "string" && payload.code.trim())
        chunks.push(payload.code);
      break;
    }
    default:
      break;
  }
}
export function estimateReadMinutesFromBlogFields(
  content: string | undefined,
  summary: string,
): number {
  const chunks: string[] = [];
  if (content && typeof content === "string" && content.trim()) {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (Array.isArray(parsed)) {
        for (const b of parsed) {
          if (!b || typeof b !== "object" || Array.isArray(b)) continue;
          const block = b as {
            type?: string;
            payload?: unknown;
          };
          const t = typeof block.type === "string" ? block.type : "";
          const pl = block.payload;
          if (pl && typeof pl === "object" && !Array.isArray(pl)) {
            appendBlockText(t, pl as Record<string, unknown>, chunks);
          }
        }
      }
    } catch {
      chunks.push(content);
    }
  }
  const body = chunks.join(" ").trim();
  const summaryPlain = summary
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const plain = body || summaryPlain;
  const words = plain.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
