import type { PublishedPolicyResponse } from '@contracts/legalApi';
import { marked } from 'marked';
import { LegalPolicyHeaderPublisher } from './LegalPolicyHeaderContext';
import { LEGAL_MARKDOWN_ROOT } from './legalUi';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bodyToHtml(body: string, bodyFormat: PublishedPolicyResponse['bodyFormat']): string {
  if (bodyFormat === 'markdown' || bodyFormat === 'mdx') {
    return marked.parse(body, { async: false });
  }
  return `<pre class="whitespace-pre-wrap font-mono text-sm">${escapeHtml(body)}</pre>`;
}

type Props = {
  data: PublishedPolicyResponse;
};

/** Title, summary, and version line are shown in `LegalPolicyPageHeader` via `LegalPolicyHeaderPublisher`. */
export function LegalPolicyDocument({ data }: Props) {
  const html = bodyToHtml(data.body, data.bodyFormat);

  return (
    <>
      <LegalPolicyHeaderPublisher data={data} />
      <div id="legal-policy-body" className={LEGAL_MARKDOWN_ROOT} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
