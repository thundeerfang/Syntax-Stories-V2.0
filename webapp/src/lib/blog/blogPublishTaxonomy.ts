export type BlogPublishTaxonomy = {
  category: string;
  tags: string[];
  language: string;
};
export function blogPublishSummaryPreviewPlain(html: string): string {
  if (!html || html === "<br>") return "";
  if (typeof document === "undefined") {
    return html
      .replaceAll(/<[^>]*>/g, " ")
      .replaceAll("&nbsp;", " ")
      .trim()
      .slice(0, 220);
  }
  const el = document.createElement("div");
  el.innerHTML = html;
  const t = (el.textContent ?? "").replaceAll(/\s+/g, " ").trim();
  return t.length > 220 ? `${t.slice(0, 217)}…` : t;
}
