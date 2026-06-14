export type AdminBlogBlockSummary = {
  index: number;
  id: string;
  type: string;
  sectionId?: string;
  preview: string;
};
export type AdminBlogContentParse = {
  blocks: unknown[];
  blockSummaries: AdminBlogBlockSummary[];
  images: Array<{
    url: string;
    source: "thumbnail" | "block";
    blockIndex?: number;
    blockType?: string;
  }>;
  textExcerpt: string;
};
function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
function previewFromBlock(block: Record<string, unknown>): string {
  const type = String(block.type ?? "unknown");
  const payload = block.payload;
  if (!payload || typeof payload !== "object") return type;
  const p = payload as Record<string, unknown>;
  switch (type) {
    case "paragraph":
    case "heading": {
      const text =
        typeof p.text === "string"
          ? p.text
          : typeof p.markdown === "string"
            ? p.markdown
            : "";
      return truncate(text.replace(/\s+/g, " "), 120) || type;
    }
    case "code":
      return truncate(String(p.body ?? p.code ?? ""), 80) || "code";
    case "image":
    case "unsplashImage":
      return typeof p.url === "string" ? truncate(p.url, 80) : type;
    case "videoEmbed":
      return typeof p.url === "string" ? truncate(p.url, 80) : type;
    case "link":
      return typeof p.url === "string" ? truncate(p.url, 80) : type;
    case "githubRepo":
      return typeof p.fullName === "string" ? p.fullName : type;
    default:
      try {
        return truncate(JSON.stringify(p), 100);
      } catch {
        return type;
      }
  }
}
function collectImagesFromBlock(
  block: Record<string, unknown>,
  index: number,
  out: AdminBlogContentParse["images"],
): void {
  const type = String(block.type ?? "");
  const payload = block.payload;
  if (!payload || typeof payload !== "object") return;
  const p = payload as Record<string, unknown>;
  const push = (url: unknown) => {
    if (typeof url === "string" && url.trim().length > 0) {
      out.push({
        url: url.trim(),
        source: "block",
        blockIndex: index,
        blockType: type,
      });
    }
  };
  if (type === "image" || type === "unsplashImage") {
    push(p.url);
    if (typeof p.src === "string") push(p.src);
  }
}
function collectTextFromBlocks(blocks: unknown[]): string {
  const parts: string[] = [];
  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;
    const type = String(b.type ?? "");
    const payload = b.payload;
    if (!payload || typeof payload !== "object") continue;
    const p = payload as Record<string, unknown>;
    if (type === "paragraph" || type === "heading") {
      const text =
        typeof p.text === "string"
          ? p.text
          : typeof p.markdown === "string"
            ? p.markdown
            : "";
      const clean = text.replace(/\s+/g, " ").trim();
      if (clean) parts.push(clean);
    }
  }
  return truncate(parts.join("\n\n"), 4000);
}
export function parseBlogContentForAdmin(
  content: string,
  thumbnailUrl?: string | null,
): AdminBlogContentParse {
  const images: AdminBlogContentParse["images"] = [];
  if (thumbnailUrl?.trim()) {
    images.push({ url: thumbnailUrl.trim(), source: "thumbnail" });
  }
  let blocks: unknown[] = [];
  const blockSummaries: AdminBlogBlockSummary[] = [];
  try {
    const parsed = JSON.parse(content || "[]");
    if (Array.isArray(parsed)) blocks = parsed;
  } catch {
    return { blocks: [], blockSummaries: [], images, textExcerpt: "" };
  }
  blocks.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const block = raw as Record<string, unknown>;
    const id = typeof block.id === "string" ? block.id : `block-${index}`;
    const type = typeof block.type === "string" ? block.type : "unknown";
    const sectionId =
      typeof block.sectionId === "string" ? block.sectionId : undefined;
    blockSummaries.push({
      index,
      id,
      type,
      sectionId,
      preview: previewFromBlock(block),
    });
    collectImagesFromBlock(block, index, images);
  });
  const seen = new Set<string>();
  const dedupedImages = images.filter((img) => {
    if (seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });
  return {
    blocks,
    blockSummaries,
    images: dedupedImages,
    textExcerpt: collectTextFromBlocks(blocks),
  };
}
