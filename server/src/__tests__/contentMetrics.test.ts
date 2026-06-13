import { measureBlogContent } from '../modules/blog/contentMetrics.js';

describe('measureBlogContent', () => {
  it('counts blocks and lines from paragraph and code blocks', () => {
    const content = JSON.stringify([
      {
        type: 'paragraph',
        payload: { text: 'Line one\nLine two' },
      },
      {
        type: 'code',
        payload: { code: 'const x = 1;\nconst y = 2;' },
      },
      {
        type: 'heading',
        payload: { text: 'Title' },
      },
    ]);

    expect(measureBlogContent(content)).toEqual({ lines: 5, blocks: 3 });
  });

  it('returns zeros for empty content', () => {
    expect(measureBlogContent('')).toEqual({ lines: 0, blocks: 0 });
  });
});
