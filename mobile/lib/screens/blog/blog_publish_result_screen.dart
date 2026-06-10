import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_post.dart';
import '../../theme/app_color_tokens.dart';
import '../../widgets/auth/auth_button.dart';

class BlogPublishResultScreen extends StatelessWidget {
  const BlogPublishResultScreen({super.key, required this.post});

  final BlogPost post;

  void _done(BuildContext context) {
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final published = post.isPublished;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.background,
        foregroundColor: colors.foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        title: Text(
          published ? 'PUBLISHED' : 'DRAFT SAVED',
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colors.card,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: colors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    published ? Icons.check_circle_rounded : Icons.save_rounded,
                    size: 40,
                    color: colors.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    published ? 'Your post is live' : 'Draft saved',
                    style: GoogleFonts.inter(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: colors.foreground,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    published
                        ? 'Readers can find it on your profile and in feeds.'
                        : 'You can publish it later from the web editor or by creating again.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: colors.mutedForeground,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    post.title,
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: colors.foreground,
                      height: 1.35,
                    ),
                  ),
                  if (post.category != null && post.category!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Category · ${post.category}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: colors.mutedForeground,
                      ),
                    ),
                  ],
                  if (post.tags.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Tags · ${post.tags.join(', ')}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: colors.mutedForeground,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Spacer(),
            AuthButton(
              label: 'Done',
              onPressed: () => _done(context),
            ),
          ],
        ),
      ),
    );
  }
}
