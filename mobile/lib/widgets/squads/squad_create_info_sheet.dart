import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

class _SquadInfoSlide {
  const _SquadInfoSlide({
    required this.title,
    required this.description,
    required this.icon,
  });

  final String title;
  final String description;
  final IconData icon;
}

const _slides = <_SquadInfoSlide>[
  _SquadInfoSlide(
    title: 'What Are Squads?',
    description:
        'Squads are small groups for reading and writing together. Members share posts, discuss topics, and build a focused community around what matters to them.',
    icon: Icons.groups_rounded,
  ),
  _SquadInfoSlide(
    title: 'Name And Branding',
    description:
        'Add a banner, squad icon, name, and description so people instantly understand your group. Public squads also pick a category for the directory.',
    icon: Icons.palette_outlined,
  ),
  _SquadInfoSlide(
    title: 'Public Or Private',
    description:
        'Public squads are searchable and open for anyone to join. Private squads stay hidden and only people with an invite can get in.',
    icon: Icons.public_rounded,
  ),
  _SquadInfoSlide(
    title: 'Posting And Moderation',
    description:
        'Choose whether all members or staff only can publish posts. You can also require moderator approval before new posts go live.',
    icon: Icons.shield_outlined,
  ),
  _SquadInfoSlide(
    title: 'Invitations',
    description:
        'Control who may add new members by username — either every member or admins and moderators only.',
    icon: Icons.person_add_alt_1_rounded,
  ),
];

/// Swipeable guide explaining how squads work — opened from create squad info button.
class SquadCreateInfoSheet extends StatefulWidget {
  const SquadCreateInfoSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SquadCreateInfoSheet(),
    );
  }

  @override
  State<SquadCreateInfoSheet> createState() => _SquadCreateInfoSheetState();
}

class _SquadCreateInfoSheetState extends State<SquadCreateInfoSheet> {
  final _pageController = PageController();
  int _activeIndex = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.card,
          border: Border.all(color: colors.border, width: 2),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 8, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'How Squads Work',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.2,
                        color: colors.foreground,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                    tooltip: 'Close',
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 248,
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (index) => setState(() => _activeIndex = index),
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    physics: const BouncingScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: colors.primary.withValues(alpha: 0.12),
                            border: Border.all(color: colors.primary, width: 2),
                          ),
                          child: Icon(slide.icon, color: colors.primary, size: 22),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          slide.title,
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: colors.foreground,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          slide.description,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            height: 1.45,
                            color: colors.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + bottomInset),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _slides.length; i++) ...[
                    if (i > 0) const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () => _pageController.animateToPage(
                        i,
                        duration: const Duration(milliseconds: 260),
                        curve: Curves.easeOutCubic,
                      ),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: i == _activeIndex
                              ? colors.primary
                              : colors.mutedForeground.withValues(alpha: 0.35),
                          border: Border.all(
                            color: i == _activeIndex ? colors.primary : colors.border,
                            width: 1,
                          ),
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
    );
  }
}
