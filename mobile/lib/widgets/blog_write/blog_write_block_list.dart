import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_block_factory.dart';
import '../ui/dashed_border_box.dart';
import 'blog_write_block_editors.dart';

class BlogWriteBlockList extends StatelessWidget {
  const BlogWriteBlockList({
    super.key,
    required this.blocks,
    required this.onChanged,
  });

  final List<BlogBlock> blocks;
  final ValueChanged<List<BlogBlock>> onChanged;

  void _updateBlock(int index, BlogBlock next) {
    final copy = List<BlogBlock>.from(blocks);
    copy[index] = next;
    onChanged(copy);
  }

  void _removeBlock(int index) {
    final copy = List<BlogBlock>.from(blocks)..removeAt(index);
    onChanged(copy);
  }

  void _reorder(int oldIndex, int newIndex) {
    final copy = List<BlogBlock>.from(blocks);
    final item = copy.removeAt(oldIndex);
    copy.insert(newIndex, item);
    onChanged(copy);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    if (blocks.isEmpty) {
      return DashedBorderBox(
        padding: const EdgeInsets.all(24),
        color: colors.border,
        child: Center(
          child: Text(
            'Add blocks from the toolbar above.',
            style: GoogleFonts.inter(fontSize: 13, color: colors.mutedForeground),
          ),
        ),
      );
    }

    return ReorderableListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      buildDefaultDragHandles: false,
      itemCount: blocks.length,
      onReorderItem: _reorder,
      proxyDecorator: (child, index, animation) {
        return Material(
          elevation: 4,
          color: colors.card,
          borderRadius: BorderRadius.circular(6),
          child: child,
        );
      },
      itemBuilder: (context, index) {
        final block = blocks[index];
        if (block.type == BlogBlockType.partition) {
          return _PartitionDividerRow(
            key: ValueKey(block.id),
            index: index,
            onRemove: () => _removeBlock(index),
          );
        }
        return _BlogWriteBlockCard(
          key: ValueKey(block.id),
          block: block,
          index: index,
          onChanged: (next) => _updateBlock(index, next),
          onRemove: () => _removeBlock(index),
        );
      },
    );
  }
}

class _BlockDragHandle extends StatelessWidget {
  const _BlockDragHandle({required this.index});

  final int index;

  @override
  Widget build(BuildContext context) {
    return ReorderableDragStartListener(
      index: index,
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Icon(
          Icons.drag_indicator_rounded,
          size: 22,
          color: context.appColors.mutedForeground,
        ),
      ),
    );
  }
}

/// Minimal divider row — dashed line only, no block chrome.
class _PartitionDividerRow extends StatelessWidget {
  const _PartitionDividerRow({
    super.key,
    required this.index,
    required this.onRemove,
  });

  final int index;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          _BlockDragHandle(index: index),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: DashedDividerLine(color: colors.border),
            ),
          ),
          IconButton(
            icon: Icon(Icons.delete_outline_rounded, size: 18, color: colors.destructive),
            onPressed: onRemove,
            tooltip: 'Remove divider',
          ),
        ],
      ),
    );
  }
}

class _BlogWriteBlockCard extends StatelessWidget {
  const _BlogWriteBlockCard({
    super.key,
    required this.block,
    required this.index,
    required this.onChanged,
    required this.onRemove,
  });

  final BlogBlock block;
  final int index;
  final ValueChanged<BlogBlock> onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: BoxDecoration(
          color: colors.card,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: colors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 6, 4, 0),
              child: Row(
                children: [
                  _BlockDragHandle(index: index),
                  Text(
                    blogBlockTypeLabel(block.type).toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1,
                      color: colors.mutedForeground,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(Icons.delete_outline_rounded, size: 18, color: colors.destructive),
                    onPressed: onRemove,
                    tooltip: 'Remove block',
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              child: BlogWriteBlockEditor(block: block, onChanged: onChanged),
            ),
          ],
        ),
      ),
    );
  }
}
