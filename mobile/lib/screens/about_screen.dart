import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/about_page_seed.dart';
import '../models/about_page_content.dart';
import '../services/platform_api.dart';
import '../theme/app_color_tokens.dart';
import '../widgets/navigation/screen_app_bar.dart';
import '../widgets/ui/app_pull_to_refresh.dart';
import '../widgets/ui/dashed_border_box.dart';

class AboutScreen extends StatefulWidget {
  const AboutScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const AboutScreen()),
    );
  }

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen> {
  final _api = PlatformApi();
  final _content = buildAboutPageContent();

  PublicPlatformStats? _stats;
  bool _statsLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _statsLoading = true);
    final stats = await _api.fetchStats();
    if (!mounted) return;
    setState(() {
      _stats = stats;
      _statsLoading = false;
    });
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: const ScreenAppBar(title: 'About'),
      body: AppPullToRefresh(
        onRefresh: _loadStats,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
          children: [
            _HeroSection(content: _content, onLegacyTap: () => _openUrl(_content.legacyV1Url)),
            const SizedBox(height: 40),
            _TeamSection(content: _content, onUrl: _openUrl),
            const SizedBox(height: 40),
            _StatsSection(
              badge: _content.statsSection.badge,
              stats: _stats,
              loading: _statsLoading,
            ),
            const SizedBox(height: 40),
            _PillarsSection(pillars: _content.pillars, primary: primary, colors: colors),
            const SizedBox(height: 40),
            _JourneySection(journey: _content.journey, colors: colors, primary: primary),
            const SizedBox(height: 24),
            _TechStackSection(tech: _content.techStack, colors: colors, primary: primary),
            const SizedBox(height: 40),
            _CtaSection(cta: _content.cta, colors: colors, primary: primary),
            const SizedBox(height: 24),
            _FooterNote(note: _content.footerNote, colors: colors, primary: primary),
          ],
        ),
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({required this.content, required this.onLegacyTap});

  final AboutPageContent content;
  final VoidCallback onLegacyTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final hero = content.hero;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _AboutBadge(label: hero.badge, centered: false),
            const Spacer(),
            Material(
              color: const Color(0xFFFACC15),
              child: InkWell(
                onTap: onLegacyTap,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.border, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: colors.shadow.withValues(alpha: 0.14),
                        offset: const Offset(4, 4),
                        blurRadius: 0,
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.terminal_rounded, size: 18, color: colors.foreground),
                      const SizedBox(width: 6),
                      Text(
                        'LEGACY V1.0',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.6,
                          color: colors.foreground,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.open_in_new_rounded, size: 14, color: colors.foreground),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Text(
          hero.title.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            fontStyle: FontStyle.italic,
            height: 0.95,
            letterSpacing: -0.5,
            color: colors.foreground,
          ),
        ),
        Text(
          hero.titleHighlight.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            fontStyle: FontStyle.italic,
            height: 0.95,
            letterSpacing: -0.5,
            color: primary,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          hero.description,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            height: 1.5,
            color: colors.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _TeamSection extends StatelessWidget {
  const _TeamSection({required this.content, required this.onUrl});

  final AboutPageContent content;
  final Future<void> Function(String url) onUrl;

  @override
  Widget build(BuildContext context) {
    final section = content.teamSection;
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return Column(
      children: [
        _AboutBadge(label: section.badge),
        const SizedBox(height: 8),
        Text(
          section.title.toUpperCase(),
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 32,
            fontWeight: FontWeight.w900,
            fontStyle: FontStyle.italic,
            letterSpacing: -0.5,
            color: colors.foreground,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          section.subtitle.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
            color: colors.mutedForeground,
          ),
        ),
        const SizedBox(height: 24),
        for (final member in content.team) ...[
          _TeamMemberCard(member: member, primary: primary, colors: colors, onUrl: onUrl),
          const SizedBox(height: 24),
        ],
      ],
    );
  }
}

class _TeamMemberCard extends StatelessWidget {
  const _TeamMemberCard({
    required this.member,
    required this.primary,
    required this.colors,
    required this.onUrl,
  });

  final AboutTeamMember member;
  final Color primary;
  final AppColorTokens colors;
  final Future<void> Function(String url) onUrl;

  @override
  Widget build(BuildContext context) {
    final portrait = member.featured ? 200.0 : (member.shadowCard ? 168.0 : 176.0);
    final borderW = member.featured || member.shadowCard ? 4.0 : 2.0;

    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            if (member.featured || member.shadowCard)
              Positioned(
                right: member.featured ? -10 : -8,
                bottom: member.featured ? -10 : -8,
                child: Container(
                  width: portrait,
                  height: portrait,
                  decoration: BoxDecoration(
                    color: member.featured ? primary : colors.border,
                    border: Border.all(
                      color: colors.border,
                      width: member.featured ? 4 : 3,
                    ),
                  ),
                ),
              ),
            Container(
              width: portrait,
              height: portrait,
              decoration: BoxDecoration(
                border: Border.all(color: colors.border, width: borderW),
                color: colors.muted.withValues(alpha: 0.2),
              ),
              clipBehavior: Clip.hardEdge,
              child: _TeamMemberPortrait(imageUrl: member.imageUrl, colors: colors),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          member.name.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: member.featured ? 20 : 16,
            fontWeight: FontWeight.w900,
            fontStyle: FontStyle.italic,
            color: colors.foreground,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          member.role.toUpperCase(),
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
            height: 1.35,
            color: primary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (member.githubUrl != null) ...[
              _SocialIconButton(
                icon: _GithubGlyph(),
                onTap: () => onUrl(member.githubUrl!),
              ),
              const SizedBox(width: 8),
            ],
            if (member.linkedinUrl != null) ...[
              _SocialIconButton(
                icon: SvgPicture.asset('assets/icons/linkedin.svg', width: 16, height: 16),
                onTap: () => onUrl(member.linkedinUrl!),
              ),
              if (member.resumeUrl != null) const SizedBox(width: 8),
            ],
            if (member.resumeUrl != null)
              _ResumeDownloadButton(onTap: () => onUrl(member.resumeUrl!)),
          ],
        ),
      ],
    );
  }
}

class _TeamMemberPortrait extends StatelessWidget {
  const _TeamMemberPortrait({required this.imageUrl, required this.colors});

  final String imageUrl;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final fallback = Icon(
      Icons.person_outline_rounded,
      size: 48,
      color: colors.mutedForeground,
    );

    if (imageUrl.startsWith('assets/')) {
      return Image.asset(
        imageUrl,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => fallback,
      );
    }

    return Image.network(
      imageUrl,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => fallback,
    );
  }
}

class _GithubGlyph extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset('assets/icons/github.svg', width: 16, height: 16);
  }
}

class _SocialIconButton extends StatelessWidget {
  const _SocialIconButton({required this.icon, required this.onTap});

  final Widget icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _TeamActionButton(
      onTap: onTap,
      square: true,
      child: icon,
    );
  }
}

class _ResumeDownloadButton extends StatelessWidget {
  const _ResumeDownloadButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return _TeamActionButton(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.download_rounded, size: 16, color: colors.foreground),
          const SizedBox(width: 4),
          Text(
            'DOWNLOAD RESUME',
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              color: colors.foreground,
            ),
          ),
        ],
      ),
    );
  }
}

class _TeamActionButton extends StatelessWidget {
  const _TeamActionButton({
    required this.onTap,
    required this.child,
    this.padding,
    this.square = false,
  });

  final VoidCallback onTap;
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final bool square;

  static const _height = 32.0;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: colors.card,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: _height,
          width: square ? _height : null,
          padding: padding,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(color: colors.border, width: 2),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _StatsSection extends StatelessWidget {
  const _StatsSection({
    required this.badge,
    required this.stats,
    required this.loading,
  });

  final String badge;
  final PublicPlatformStats? stats;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    final icons = [
      Icons.article_outlined,
      Icons.people_outline_rounded,
      Icons.layers_outlined,
      Icons.monitor_heart_outlined,
    ];

    final labels = [
      'Lines written',
      'Active Users',
      'Components',
      'Uptime',
    ];

    String formatInt(int? n) {
      if (loading || n == null) return '—';
      return n.toString().replaceAllMapped(
            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
            (m) => '${m[1]},',
          );
    }

    String formatUptime(double? v) {
      if (loading || v == null) return '—';
      return '${v.toStringAsFixed(1)}%';
    }

    final values = [
      formatInt(stats?.linesWritten),
      formatInt(stats?.activeUsers),
      formatInt(stats?.components),
      formatUptime(stats?.uptimePercent),
    ];

    return Column(
      children: [
        _AboutBadge(label: badge),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.15,
          children: [
            for (var i = 0; i < values.length; i++)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: colors.card,
                  border: Border.all(color: colors.border, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: colors.shadow.withValues(alpha: 0.08),
                      offset: const Offset(2, 2),
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icons[i], size: 24, color: primary),
                    const SizedBox(height: 8),
                    Text(
                      values[i],
                      style: GoogleFonts.inter(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        fontStyle: FontStyle.italic,
                        color: primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      labels[i].toUpperCase(),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                        color: colors.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _PillarsSection extends StatelessWidget {
  const _PillarsSection({
    required this.pillars,
    required this.primary,
    required this.colors,
  });

  final List<AboutPillar> pillars;
  final Color primary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < pillars.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _PillarCard(pillar: pillars[i], primary: primary, colors: colors),
        ],
      ],
    );
  }
}

class _PillarCard extends StatelessWidget {
  const _PillarCard({
    required this.pillar,
    required this.primary,
    required this.colors,
  });

  final AboutPillar pillar;
  final Color primary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, icon) = switch (pillar.variant) {
      AboutPillarVariant.dark => (
          colors.foreground,
          colors.background,
          colors.background,
        ),
      AboutPillarVariant.primary => (
          primary,
          colors.primaryForeground,
          colors.primaryForeground,
        ),
      AboutPillarVariant.card => (
          colors.card,
          colors.foreground,
          primary,
        ),
    };

    final pillarIcon = switch (pillar.icon) {
      AboutPillarIcon.layers => Icons.layers_outlined,
      AboutPillarIcon.globe => Icons.public_rounded,
      AboutPillarIcon.zap => Icons.bolt_rounded,
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: colors.border, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(pillarIcon, size: 36, color: icon),
          const SizedBox(height: 12),
          Text(
            pillar.title.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              color: fg,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            pillar.description,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              height: 1.45,
              color: switch (pillar.variant) {
                AboutPillarVariant.dark => fg.withValues(alpha: 0.75),
                AboutPillarVariant.primary => fg.withValues(alpha: 0.9),
                AboutPillarVariant.card => colors.mutedForeground,
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _JourneySection extends StatelessWidget {
  const _JourneySection({
    required this.journey,
    required this.colors,
    required this.primary,
  });

  final List<AboutJourneyItem> journey;
  final AppColorTokens colors;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'THE JOURNEY',
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 20),
          for (var i = 0; i < journey.length; i++) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.border, width: 3),
                    color: colors.background,
                  ),
                  child: Text(
                    '${i + 1}',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      color: colors.foreground,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        journey[i].year.toUpperCase(),
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: primary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        journey[i].event,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          height: 1.4,
                          color: colors.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (i < journey.length - 1) const SizedBox(height: 20),
          ],
        ],
      ),
    );
  }
}

class _TechStackSection extends StatelessWidget {
  const _TechStackSection({
    required this.tech,
    required this.colors,
    required this.primary,
  });

  final List<AboutTechItem> tech;
  final AppColorTokens colors;
  final Color primary;

  IconData _iconFor(String name) => switch (name) {
        'Globe' => Icons.public_rounded,
        'Layers' => Icons.layers_outlined,
        'Terminal' => Icons.terminal_rounded,
        'Cpu' => Icons.memory_rounded,
        'Database' => Icons.storage_rounded,
        'Zap' => Icons.bolt_rounded,
        'Box' => Icons.widgets_outlined,
        'Workflow' => Icons.account_tree_outlined,
        _ => Icons.code_rounded,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'BUILT WITH',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 2.2,
            ),
            itemCount: tech.length,
            itemBuilder: (context, index) {
              final item = tech[index];
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  border: Border.all(color: colors.border, width: 2),
                  color: colors.background,
                ),
                child: Row(
                  children: [
                    Icon(_iconFor(item.icon), size: 22, color: primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.name.toUpperCase(),
                        style: GoogleFonts.inter(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: colors.foreground,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CtaSection extends StatelessWidget {
  const _CtaSection({
    required this.cta,
    required this.colors,
    required this.primary,
  });

  final AboutCta cta;
  final AppColorTokens colors;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: primary,
        border: Border.all(color: colors.border, width: 2),
      ),
      child: Column(
        children: [
          Text(
            cta.title.toUpperCase(),
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              height: 0.95,
              color: colors.primaryForeground,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            cta.description.toUpperCase(),
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
              color: colors.primaryForeground.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () => Navigator.maybePop(context),
            style: OutlinedButton.styleFrom(
              foregroundColor: colors.foreground,
              side: BorderSide(color: colors.border, width: 2),
              backgroundColor: colors.card,
            ),
            child: Text(
              cta.buttonLabel.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                color: colors.foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FooterNote extends StatelessWidget {
  const _FooterNote({
    required this.note,
    required this.colors,
    required this.primary,
  });

  final String note;
  final AppColorTokens colors;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.favorite_rounded, size: 16, color: primary),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            note.toUpperCase(),
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.5,
              color: colors.mutedForeground,
            ),
          ),
        ),
      ],
    );
  }
}

class _AboutBadge extends StatelessWidget {
  const _AboutBadge({required this.label, this.centered = true});

  final String label;
  final bool centered;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    final badge = DashedBorderBox(
      expandWidth: false,
      color: primary.withValues(alpha: 0.5),
      strokeWidth: 2,
      dashLength: 6,
      dashGap: 4,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Text(
        label.toUpperCase(),
        style: GoogleFonts.inter(
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 2,
          color: primary,
        ),
      ),
    );

    return centered ? Center(child: badge) : badge;
  }
}
