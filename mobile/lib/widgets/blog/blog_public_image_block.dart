import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/blog_block.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../blog_write/blog_image_layout_chips.dart';
import '../blog_write/blog_image_layout_preview.dart';

/// Public uploaded image — no frame, badges, or rounded corners.
class BlogPublicImageBlock extends StatelessWidget {
  const BlogPublicImageBlock({super.key, required this.block});

  final BlogBlock block;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final url = block.payload['url']?.toString();
    final resolved = url != null && url.isNotEmpty ? resolveProfileMediaUrl(url) : null;
    final layout = coerceBlogImageLayout(block.payload['layout']?.toString());

    if (resolved == null || resolved.isEmpty) return const SizedBox.shrink();

    return _PublicBlogImage(
      imageUrl: resolved,
      layout: layout,
      colors: colors,
    );
  }
}

/// Unsplash image — small `Photo by` chip bottom-right on the image.
class BlogPublicUnsplashImageBlock extends StatelessWidget {
  const BlogPublicUnsplashImageBlock({super.key, required this.block});

  final BlogBlock block;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final payload = block.payload;
    final url = payload['url']?.toString();
    final resolved = url != null && url.isNotEmpty ? resolveProfileMediaUrl(url) : null;
    final layout = coerceBlogImageLayout(payload['layout']?.toString());
    final creditLine = _unsplashCreditLine(payload['photographer']?.toString());
    final photoHref = _unsplashPhotoHref(payload['unsplashPhotoId']?.toString());

    if (resolved == null || resolved.isEmpty) return const SizedBox.shrink();

    return _PublicBlogImage(
      imageUrl: resolved,
      layout: layout,
      colors: colors,
      creditLine: creditLine,
      onCreditTap: creditLine.isEmpty
          ? null
          : () async {
              final uri = Uri.parse(photoHref);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
    );
  }
}

String _unsplashCreditLine(String? photographer) {
  final name = photographer?.trim() ?? '';
  if (name.isEmpty) return '';
  if (RegExp(r'^Photo by', caseSensitive: false).hasMatch(name)) return name;
  return 'Photo by $name';
}

String _unsplashPhotoHref(String? photoId) {
  final id = photoId?.trim() ?? '';
  if (id.isEmpty) return 'https://unsplash.com';
  return 'https://unsplash.com/photos/$id';
}

double _finiteLayoutWidth(BoxConstraints constraints, BuildContext context) {
  final max = constraints.maxWidth;
  if (max.isFinite && max > 0) return max;
  final screen = MediaQuery.sizeOf(context).width;
  if (screen.isFinite && screen > 0) return screen;
  return 360;
}

class _PublicBlogImage extends StatelessWidget {
  const _PublicBlogImage({
    required this.imageUrl,
    required this.layout,
    required this.colors,
    this.creditLine = '',
    this.onCreditTap,
  });

  final String imageUrl;
  final String layout;
  final AppColorTokens colors;
  final String creditLine;
  final VoidCallback? onCreditTap;

  static const _landscapeMaxWidth = 672.0;
  static const _squareMaxWidth = 576.0;

  @override
  Widget build(BuildContext context) {
    final resolved = coerceBlogImageLayout(layout);

    if (resolved == 'fullWidth') {
      return LayoutBuilder(
        builder: (context, constraints) {
          final width = _finiteLayoutWidth(constraints, context);
          return _buildFramedImage(
            layout: resolved,
            width: width,
            height: width / blogImageAspectForLayout('landscape'),
            cover: true,
          );
        },
      );
    }

    if (resolved == 'square') {
      return Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _squareMaxWidth),
          child: AspectRatio(
            aspectRatio: 1,
            child: _buildFramedImage(layout: resolved, cover: true),
          ),
        ),
      );
    }

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _landscapeMaxWidth),
        child: AspectRatio(
          aspectRatio: blogImageAspectForLayout('landscape'),
          child: _buildFramedImage(layout: resolved, cover: true),
        ),
      ),
    );
  }

  Widget _buildFramedImage({
    required String layout,
    double? width,
    double? height,
    required bool cover,
  }) {
    final bitmap = _networkImage(
      layout: layout,
      width: width,
      height: height,
      cover: cover,
    );

    if (creditLine.isEmpty) return bitmap;

    return Stack(
      fit: width == null ? StackFit.expand : StackFit.loose,
      children: [
        bitmap,
        Positioned(
          right: 8,
          bottom: 8,
          child: _UnsplashCreditBadge(
            label: creditLine,
            onTap: onCreditTap,
          ),
        ),
      ],
    );
  }

  Widget _networkImage({
    required String layout,
    double? width,
    double? height,
    required bool cover,
  }) {
    final fit = cover ? BoxFit.cover : BoxFit.fitWidth;

    if (width != null && height != null) {
      return SizedBox(
        width: width,
        height: height,
        child: Image.network(
          imageUrl,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (_, _, _) => _brokenImage(width: width, height: height),
        ),
      );
    }

    return Image.network(
      imageUrl,
      fit: fit,
      errorBuilder: (_, _, _) => _brokenImage(
        width: width ?? _landscapeMaxWidth,
        height: height ?? _landscapeMaxWidth / blogImageAspectForLayout('landscape'),
      ),
    );
  }

  Widget _brokenImage({required double width, required double height}) {
    return SizedBox(
      width: width,
      height: height,
      child: Center(
        child: Icon(Icons.broken_image_outlined, color: colors.mutedForeground),
      ),
    );
  }
}

class _UnsplashCreditBadge extends StatelessWidget {
  const _UnsplashCreditBadge({
    required this.label,
    this.onTap,
  });

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final chip = Container(
      constraints: const BoxConstraints(maxWidth: 160),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white.withValues(alpha: 0.35), width: 1),
        color: Colors.black.withValues(alpha: 0.72),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      child: Text(
        label.toUpperCase(),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: GoogleFonts.jetBrainsMono(
          fontSize: 7,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
          height: 1.1,
          color: Colors.white,
        ),
      ),
    );

    if (onTap == null) return chip;
    return Material(
      color: Colors.transparent,
      child: InkWell(onTap: onTap, child: chip),
    );
  }
}
