import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/project_item.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/github_project_identity.dart';

class OpenSourceRepoCard extends StatelessWidget {
  const OpenSourceRepoCard({
    super.key,
    required this.item,
    required this.onRemove,
    this.onOpen,
    this.showActions = true,
  });

  final ProjectItem item;
  final VoidCallback onRemove;
  final VoidCallback? onOpen;
  final bool showActions;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final fullName = item.repoFullName?.trim().isNotEmpty == true
        ? item.repoFullName!.trim()
        : item.title.trim();
    final shortName = fullName.contains('/') ? fullName.split('/').last : fullName;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Stack(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(12, 12, showActions ? 44 : 12, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
                    color: colors.muted.withValues(alpha: 0.12),
                  ),
                  child: Icon(Icons.code_outlined, color: colors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'GITHUB REPO',
                        style: GoogleFonts.inter(
                          fontSize: 8,
                          fontWeight: FontWeight.w800,
                          color: colors.mutedForeground,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        shortName.toUpperCase(),
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900),
                      ),
                      if (fullName.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          fullName.toUpperCase(),
                          style: GoogleFonts.inter(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: colors.primary,
                          ),
                        ),
                      ],
                      if (item.description?.trim().isNotEmpty == true) ...[
                        const SizedBox(height: 6),
                        Text(
                          item.description!.trim(),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(fontSize: 10, color: colors.mutedForeground),
                        ),
                      ],
                      if (onOpen != null && item.publicationUrl?.trim().isNotEmpty == true) ...[
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: onOpen,
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'VIEW ON GITHUB',
                            style: GoogleFonts.inter(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (showActions)
            Positioned(
              top: 4,
              right: 4,
              child: IconButton(
                onPressed: onRemove,
                icon: Icon(Icons.link_off_outlined, size: 18, color: colors.destructive),
                tooltip: 'Unlink',
              ),
            ),
        ],
      ),
    );
  }
}

class OpenSourceRepoCardList extends StatelessWidget {
  const OpenSourceRepoCardList({
    super.key,
    required this.items,
    required this.onRemoveAt,
  });

  final List<ProjectItem> items;
  final ValueChanged<int> onRemoveAt;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < items.length; i++) ...[
          OpenSourceRepoCard(
            item: items[i],
            onRemove: () => onRemoveAt(i),
            onOpen: () => _openRepo(context, items[i]),
          ),
          if (i < items.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }

  Future<void> _openRepo(BuildContext context, ProjectItem item) async {
    final url = item.publicationUrl?.trim();
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

String openSourceRepoKey(ProjectItem item) {
  final fullName = item.repoFullName?.trim();
  if (fullName != null && fullName.isNotEmpty) {
    return normalizeGithubRepoFullName(fullName).toLowerCase();
  }
  return item.publicationUrl?.trim().toLowerCase() ?? item.title.trim().toLowerCase();
}
