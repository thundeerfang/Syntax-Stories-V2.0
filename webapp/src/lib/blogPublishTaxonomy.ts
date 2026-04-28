export type BlogPublishTaxonomy = {
  category: string;
  tags: string[];
  language: string;
};

export const BLOG_PUBLISH_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
] as const;

export function blogPublishSummaryPreviewPlain(html: string): string {
  if (!html || html === '<br>') return '';
  if (typeof document === 'undefined') {
    return html.replaceAll(/<[^>]*>/g, ' ').replaceAll('&nbsp;', ' ').trim().slice(0, 220);
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  const t = (div.textContent ?? '').replaceAll(/\s+/g, ' ').trim();
  return t.length > 220 ? `${t.slice(0, 217)}…` : t;
}
