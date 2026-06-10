import 'dart:math';

import '../models/blog_block.dart';

String _newBlockId() {
  final rand = Random();
  final suffix = List.generate(7, (_) => rand.nextInt(36).toRadixString(36)).join();
  return 'b-${DateTime.now().millisecondsSinceEpoch}-$suffix';
}

BlogBlock createBlogBlock(String type, {String sectionId = blogPrimarySectionId}) {
  final id = _newBlockId();
  switch (type) {
    case BlogBlockType.paragraph:
      return BlogBlock(id: id, type: type, sectionId: sectionId, payload: {'text': ''});
    case BlogBlockType.heading:
      return BlogBlock(
        id: id,
        type: type,
        sectionId: sectionId,
        payload: {'text': '', 'level': 2},
      );
    case BlogBlockType.code:
      return BlogBlock(
        id: id,
        type: type,
        sectionId: sectionId,
        payload: {'code': '', 'language': 'plaintext', 'languageSource': 'auto'},
      );
    case BlogBlockType.table:
      return BlogBlock(
        id: id,
        type: type,
        sectionId: sectionId,
        payload: {
          'rows': [
            ['Feature', 'Option A', 'Option B'],
            [''],
          ],
        },
      );
    case BlogBlockType.mermaidDiagram:
      return BlogBlock(
        id: id,
        type: type,
        sectionId: sectionId,
        payload: {
          'source': 'graph TD\n  A[Client App] --> B[API]\n  B --> C[Database]',
        },
      );
    case BlogBlockType.partition:
    case BlogBlockType.image:
    case BlogBlockType.videoEmbed:
    case BlogBlockType.githubRepo:
    case BlogBlockType.unsplashImage:
      return BlogBlock(id: id, type: type, sectionId: sectionId, payload: {});
    default:
      return BlogBlock(id: id, type: BlogBlockType.paragraph, sectionId: sectionId, payload: {'text': ''});
  }
}

List<BlogBlock> stripLegacyGifBlocks(List<BlogBlock> blocks) {
  return blocks.where((b) => b.type != 'gif').toList();
}

String blogBlockTypeLabel(String type) => switch (type) {
      BlogBlockType.paragraph => 'Paragraph',
      BlogBlockType.heading => 'Sub-heading',
      BlogBlockType.partition => 'Divider',
      BlogBlockType.code => 'Code',
      BlogBlockType.image => 'Image',
      BlogBlockType.videoEmbed => 'Video',
      BlogBlockType.githubRepo => 'GitHub repo',
      BlogBlockType.unsplashImage => 'Unsplash',
      BlogBlockType.table => 'Table',
      BlogBlockType.mermaidDiagram => 'Mermaid',
      _ => type,
    };
