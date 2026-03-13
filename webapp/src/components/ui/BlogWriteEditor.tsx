import React, { useCallback } from 'react';
import { AlignLeft, Minus, Image as ImageIcon, Gauge, Film, Link2, Github, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { BottomToolbar } from '@/components/ui/BottomToolbar';

export type BlockType =
  | 'paragraph'
  | 'code'
  | 'partition'
  | 'image'
  | 'gif'
  | 'videoEmbed'
  | 'link'
  | 'githubRepo'
  | 'unsplashImage';

export interface BlockBase {
  id: string;
  type: BlockType;
  sectionId?: string;
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  payload: { text: string };
}

export type Block = ParagraphBlock | BlockBase & { payload?: any };

export function createBlockInSection(type: BlockType, sectionId: string): Block {
  const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  if (type === 'paragraph') {
    return { id, type: 'paragraph', sectionId, payload: { text: '' } };
  }
  return { id, type, sectionId, payload: {} };
}

export interface BlogWriteEditorProps {
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  token: string | null;
  currentUserUsername?: string;
  isSidebarOpen: boolean;
  maxWidthClassName?: string;
  activeSectionId: string;
}

export function BlogWriteEditor({
  blocks,
  onBlocksChange,
  token,
  currentUserUsername,
  isSidebarOpen,
  maxWidthClassName = 'max-w-3xl',
  activeSectionId,
}: BlogWriteEditorProps) {
  const updateBlock = useCallback(
    (id: string, payload: any) => {
      onBlocksChange(
        blocks.map((b) => (b.id === id ? { ...b, payload } : b)),
      );
    },
    [blocks, onBlocksChange],
  );

  const removeBlock = useCallback(
    (id: string) => {
      const next = blocks.filter((b) => b.id !== id);
      if (next.length) {
        onBlocksChange(next);
      } else {
        onBlocksChange([createBlockInSection('paragraph', activeSectionId)]);
      }
    },
    [blocks, onBlocksChange, activeSectionId],
  );

  const addBlock = useCallback(
    (type: BlockType) => {
      const inSectionCount = blocks.filter(
        (b) => (b.sectionId ?? activeSectionId) === activeSectionId,
      ).length;
      if (inSectionCount >= 10) {
        toast.error('Section limit reached (10 blocks)');
        return;
      }
      onBlocksChange([
        ...blocks,
        createBlockInSection(type, activeSectionId),
      ]);
    },
    [blocks, onBlocksChange, activeSectionId],
  );

  const visibleBlocks = blocks.filter(
    (b) => (b.sectionId ?? activeSectionId) === activeSectionId,
  );

  return (
    <div className="pb-16 selection:bg-primary selection:text-primary-foreground">
      <div className="space-y-4 mb-6">
        {visibleBlocks.map((block) => {
          if (block.type === 'paragraph') {
            return (
              <div
                key={block.id}
                className="border-2 border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  <span className="flex items-center gap-2">
                    <AlignLeft className="h-3.5 w-3.5" /> Markdown_Buffer
                  </span>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => removeBlock(block.id)}
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={block.payload?.text ?? ''}
                  onChange={(e) =>
                    updateBlock(block.id, { text: e.target.value })
                  }
                  placeholder="// Type your content here..."
                  className="w-full min-h-[150px] bg-muted/20 border border-border p-3 font-mono text-sm leading-relaxed focus:outline-none focus:border-primary resize-y"
                />
              </div>
            );
          }

          if (block.type === 'partition') {
            return (
              <div
                key={block.id}
                className="py-4 flex items-center justify-center"
              >
                <div className="w-full border-t border-dashed border-border" />
              </div>
            );
          }

          // Simple placeholders for other block types to avoid runtime errors
          return (
            <div
              key={block.id}
              className="border border-dashed border-border bg-card p-3 text-[11px] text-muted-foreground flex items-center justify-between"
            >
              <span>Block: {block.type}</span>
              <button
                type="button"
                className="text-destructive"
                onClick={() => removeBlock(block.id)}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <BottomToolbar
          label="Blocks"
          onItemClick={(id) => addBlock(id as BlockType)}
        />
      </div>
    </div>
  );
}

