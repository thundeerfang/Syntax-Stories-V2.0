/** Blog post content validation caps — server `blogContentValidation.ts` enforces these. */

export const BLOG_LIMITS = {
  maxContentChars: 2_500_000,
  maxBlocks: 300,
  maxBlockIdLen: 128,
  maxSectionIdLen: 80,
  maxParagraphText: 400_000,
  maxRichDocJsonChars: 900_000,
  maxHeadingText: 8_000,
  maxUrlLen: 2_000,
  maxCaption: 4_000,
  maxGithubDesc: 12_000,
  maxGenericPayloadJson: 120_000,
  maxCodeBodyChars: 200_000,
  maxTableRows: 20,
  maxTableCols: 5,
  maxTableCellChars: 4_000,
  maxMermaidSourceChars: 120_000,
  slugMaxLen: 320,
  summaryMaxLen: 12_000,
} as const;
