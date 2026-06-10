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
          children: [
            Expanded(
              child: Center(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                  decoration: BoxDecoration(
                    color: colors.card,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: colors.border),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Icon(
                        published ? Icons.check_circle_rounded : Icons.save_rounded,
                        size: 40,
                        color: colors.primary,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        published ? 'Your post is live' : 'Draft saved',
                        textAlign: TextAlign.center,
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
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: colors.mutedForeground,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
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
