import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugifyHeading } from '@/lib/markdown/parseMarkdownHeadings';

type Props = {
  content: string;
  className?: string;
};

function headingText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(headingText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return headingText((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

function buildHeadingComponents(): Partial<Components> {
  const usedIds = new Map<string, number>();

  function nextId(text: string): string {
    const base = slugifyHeading(text) || 'section';
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  }

  return {
    h2: ({ children }) => {
      const text = headingText(children);
      const id = nextId(text);
      return <h2 id={id}>{children}</h2>;
    },
    h3: ({ children }) => {
      const text = headingText(children);
      const id = nextId(text);
      return <h3 id={id}>{children}</h3>;
    },
  };
}

export function DocsMarkdown({ content, className }: Props) {
  const components = buildHeadingComponents();

  return (
    <div className={className ?? 'docs-prose'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
