import 'package:flutter/material.dart';

import 'blog_image_layout_chips.dart';

const double kBlogLandscapeAspect = 16 / 9;

BoxFit blogImageFitForLayout(String layout) {
  return coerceBlogImageLayout(layout) == 'fullWidth' ? BoxFit.contain : BoxFit.cover;
}

double blogImageAspectForLayout(String layout) {
  switch (coerceBlogImageLayout(layout)) {
    case 'square':
      return 1.0;
    case 'fullWidth':
    case 'landscape':
      return kBlogLandscapeAspect;
    default:
      return kBlogLandscapeAspect;
  }
}

/// Editor/preview frame for image + Unsplash blocks.
class BlogImageLayoutFrame extends StatelessWidget {
  const BlogImageLayoutFrame({
    super.key,
    required this.layout,
    required this.child,
  });

  final String layout;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final resolved = coerceBlogImageLayout(layout);
    final framed = AspectRatio(
      aspectRatio: blogImageAspectForLayout(resolved),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: child,
      ),
    );

    if (resolved == 'landscape') {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: framed,
      );
    }

    return framed;
  }
}
