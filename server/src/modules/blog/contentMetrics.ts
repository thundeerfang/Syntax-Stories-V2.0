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
function countLinesInText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split("\n").length;
}
function appendBlockMetrics(
  type: string,
  payload: Record<string, unknown>,
  lines: number,
): number {
  switch (type) {
    case "paragraph": {
      const text = typeof payload.text === "string" ? payload.text : "";
      if (text.trim()) return lines + countLinesInText(text);
      if (payload.doc) {
        const fromDoc: string[] = [];
        collectTextFromProseDoc(payload.doc, fromDoc);
        if (fromDoc.length) return lines + countLinesInText(fromDoc.join("\n"));
      }
      return lines;
    }
    case "heading": {
      if (typeof payload.text === "string" && payload.text.trim()) {
        return lines + countLinesInText(payload.text);
      }
      return lines;
    }
    case "code": {
      if (typeof payload.code === "string" && payload.code.trim()) {
        return lines + countLinesInText(payload.code);
      }
      return lines;
    }
    case "table": {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      return lines + rows.length;
    }
    default:
      return lines;
  }
}
export type BlogContentMetrics = {
  lines: number;
  blocks: number;
};
export function measureBlogContent(
  content: string | undefined,
): BlogContentMetrics {
  if (!content || !content.trim()) {
    return { lines: 0, blocks: 0 };
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) {
      return { lines: countLinesInText(content), blocks: 0 };
    }
    let lines = 0;
    let blocks = 0;
    for (const item of parsed) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const block = item as {
        type?: string;
        payload?: unknown;
      };
      blocks += 1;
      const type = typeof block.type === "string" ? block.type : "";
      const payload = block.payload;
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        lines = appendBlockMetrics(
          type,
          payload as Record<string, unknown>,
          lines,
        );
      }
    }
    return { lines, blocks };
  } catch {
    return { lines: countLinesInText(content), blocks: 0 };
  }
}
