'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Link, Typography, alpha, useTheme } from '@mui/material';
import { parseMarkdownHeadings } from '@/lib/legal/parseMarkdownHeadings';

const HEADING_VARIANTS = ['h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2'] as const;
type MarkdownAstNode = {
  position?: {
    start?: {
      line?: number;
    };
  };
};

function headingVariant(level: number) {
  return HEADING_VARIANTS[Math.min(Math.max(level - 1, 0), HEADING_VARIANTS.length - 1)];
}

export function AdminMarkdownView({ markdown }: { markdown: string }) {
  const theme = useTheme();
  const headings = useMemo(() => parseMarkdownHeadings(markdown), [markdown]);
  const headingIdsByLine = useMemo(
    () => new Map(headings.map((heading) => [heading.line, heading.id])),
    [headings]
  );

  const borderColor = alpha(theme.palette.divider, 0.9);
  const codeBg = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.05);

  function headingIdFromNode(node: unknown) {
    const line = (node as MarkdownAstNode | undefined)?.position?.start?.line;
    return typeof line === 'number' ? headingIdsByLine.get(line) : undefined;
  }

  return (
    <Box
      className="admin-markdown-view"
      sx={{
        color: 'text.primary',
        fontSize: '0.9375rem',
        lineHeight: 1.65,
        '& p': { m: 0, mb: 1.5 },
        '& p:last-child': { mb: 0 },
        '& ul, & ol': { mt: 0, mb: 1.5, pl: 2.5 },
        '& li': { mb: 0.5 },
        '& blockquote': {
          m: 0,
          mb: 1.5,
          pl: 2,
          borderLeft: '3px solid',
          borderColor: 'primary.main',
          color: 'text.secondary',
        },
        '& pre': {
          m: 0,
          mb: 1.5,
          p: 1.5,
          borderRadius: 1.5,
          overflow: 'auto',
          bgcolor: codeBg,
          fontSize: '0.8125rem',
        },
        '& code': {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.85em',
          bgcolor: codeBg,
          px: 0.5,
          py: 0.15,
          borderRadius: 0.5,
        },
        '& pre code': { bgcolor: 'transparent', p: 0 },
        '& hr': { border: 'none', borderTop: `1px solid ${borderColor}`, my: 2 },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          mb: 1.5,
          fontSize: '0.875rem',
        },
        '& th, & td': {
          border: `1px solid ${borderColor}`,
          px: 1,
          py: 0.75,
          textAlign: 'left',
        },
        '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.text.primary, 0.04) },
        '& a': { color: 'primary.main', textDecoration: 'underline' },
      }}
    >
      <ReactMarkdown
        components={{
          h1: ({ node, children }) => (
            <Typography
              id={headingIdFromNode(node)}
              variant={headingVariant(1)}
              component="h1"
              fontWeight={800}
              gutterBottom
              sx={{ mt: 2, mb: 1, scrollMarginTop: 96, '&:first-of-type': { mt: 0 } }}
            >
              {children}
            </Typography>
          ),
          h2: ({ node, children }) => (
            <Typography
              id={headingIdFromNode(node)}
              variant={headingVariant(2)}
              component="h2"
              fontWeight={700}
              gutterBottom
              sx={{ mt: 2, mb: 1, scrollMarginTop: 96 }}
            >
              {children}
            </Typography>
          ),
          h3: ({ node, children }) => (
            <Typography
              id={headingIdFromNode(node)}
              variant={headingVariant(3)}
              component="h3"
              fontWeight={700}
              gutterBottom
              sx={{ mt: 1.5, mb: 0.75, scrollMarginTop: 96 }}
            >
              {children}
            </Typography>
          ),
          h4: ({ node, children }) => (
            <Typography
              id={headingIdFromNode(node)}
              variant={headingVariant(4)}
              component="h4"
              fontWeight={600}
              gutterBottom
              sx={{ mt: 1.5, mb: 0.75, scrollMarginTop: 96 }}
            >
              {children}
            </Typography>
          ),
          h5: ({ node, children }) => (
            <Typography
              id={headingIdFromNode(node)}
              variant={headingVariant(5)}
              component="h5"
              fontWeight={600}
              gutterBottom
              sx={{ mt: 1.25, mb: 0.5, scrollMarginTop: 96 }}
            >
              {children}
            </Typography>
          ),
          h6: ({ node, children }) => (
            <Typography
              id={headingIdFromNode(node)}
              variant={headingVariant(6)}
              component="h6"
              fontWeight={600}
              gutterBottom
              sx={{ mt: 1.25, mb: 0.5, scrollMarginTop: 96 }}
            >
              {children}
            </Typography>
          ),
          p: ({ children }) => <Typography component="p">{children}</Typography>,
          a: ({ href, children }) => (
            <Link href={href ?? '#'} target="_blank" rel="noopener noreferrer">
              {children}
            </Link>
          ),
          strong: ({ children }) => (
            <Box component="strong" sx={{ fontWeight: 700 }}>
              {children}
            </Box>
          ),
        }}
      >
        {markdown || '*No content yet.*'}
      </ReactMarkdown>
    </Box>
  );
}

/** Scroll to a heading id in the rendered markdown panel. */
export function scrollToMarkdownHeading(headingId: string) {
  const el = document.getElementById(headingId);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
