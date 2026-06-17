import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../screens/squads/my_squads_screen.dart';
import '../../screens/squads/profile_user_squads_screen.dart';
import '../../models/squad_summary.dart';
import '../../services/squad_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';

const kProfileFollowedSquadsPreviewLimit = 5;
const kProfileSquadCardSize = 48.0;
const kProfileSquadCardStep = 18.0;
const kProfileSquadCardScaleStep = 0.045;

/// Light stack border — visible but not heavy.
Color profileSquadStackBorder(AppColorTokens colors) =>
    colors.mutedForeground.withValues(alpha: 0.28);

/// Overlapping squad logos for the account profile — top squads from `/api/squads/mine`.
class ProfileFollowedSquadsStack extends StatefulWidget {
  const ProfileFollowedSquadsStack({
    super.key,
    this.horizontalPadding = 20,
    this.embedded = false,
    this.username,
  });

  final double horizontalPadding;
  final bool embedded;
  /// When set, loads public squads for this profile instead of the signed-in user's squads.
  final String? username;

  @override
  State<ProfileFollowedSquadsStack> createState() => ProfileFollowedSquadsStackState();
}

class ProfileFollowedSquadsStackState extends State<ProfileFollowedSquadsStack> {
  final _api = SquadApi();

  List<SquadSummary> _squads = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  Future<void> reload() => _load();

  Future<void> _load() async {
    final profileUsername = widget.username?.trim().toLowerCase();
    if (profileUsername != null && profileUsername.isNotEmpty) {
      setState(() => _loading = true);
      try {
        final token = context.read<AuthState>().accessToken;
        final result = await _api.listForUser(
          profileUsername,
          bearer: token,
        );
        if (!mounted) return;
        setState(() {
          _squads = result.squads;
          _loading = false;
        });
      } catch (_) {
        if (!mounted) return;
        setState(() {
          _squads = const [];
          _loading = false;
        });
      }
      return;
    }

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _squads = const [];
          _loading = false;
        });
      }
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await _api.listMine(bearer: token);
      if (!mounted) return;
      setState(() {
        _squads = result.squads;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _squads = const [];
        _loading = false;
      });
    }
  }

  @override
  void didUpdateWidget(covariant ProfileFollowedSquadsStack oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.username != widget.username) {
      reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _squads.isEmpty) return const SizedBox.shrink();

    final colors = context.appColors;
    final visible = _squads.take(kProfileFollowedSquadsPreviewLimit).toList();
    final overflow = _squads.length - visible.length;
    const cardSize = kProfileSquadCardSize;
    const step = kProfileSquadCardStep;
    final slotCount = visible.length + (overflow > 0 ? 1 : 0);
    final stackWidth = cardSize + (slotCount - 1) * step;
    final borderColor = profileSquadStackBorder(colors);

    final stack = Material(
      color: Colors.transparent,
      child: InkWell(
        canRequestFocus: false,
        onTap: _openSquads,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: SizedBox(
            width: stackWidth,
            height: cardSize,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.bottomLeft,
              children: [
                for (var i = 0; i < visible.length; i++)
                  Positioned(
                    left: i * step,
                    bottom: 0,
                    child: ProfileSquadStackCard(
                      squad: visible[i],
                      size: cardSize,
                      scale: 1 - (visible.length - 1 - i) * kProfileSquadCardScaleStep,
                      borderColor: borderColor,
                      colors: colors,
                    ),
                  ),
                if (overflow > 0)
                  Positioned(
                    left: visible.length * step,
                    bottom: 0,
                    child: ProfileStackOverflowBadge(
                      count: overflow,
                      size: cardSize,
                      borderColor: borderColor,
                      colors: colors,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );

    if (widget.embedded) return stack;

    return Padding(
      padding: EdgeInsets.fromLTRB(widget.horizontalPadding, 0, widget.horizontalPadding, 12),
      child: stack,
    );
  }

  void _openSquads() {
    final profileUsername = widget.username?.trim();
    if (profileUsername != null && profileUsername.isNotEmpty) {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(
          builder: (_) => ProfileUserSquadsScreen(username: profileUsername),
        ),
      );
      return;
    }

    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const MySquadsScreen()),
    );
  }
}

class ProfileSquadStackCard extends StatelessWidget {
  const ProfileSquadStackCard({
    super.key,
    required this.squad,
    required this.size,
    required this.scale,
    required this.borderColor,
    required this.colors,
  });

  final SquadSummary squad;
  final double size;
  final double scale;
  final Color borderColor;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final iconUrl = resolveProfileMediaUrl(squad.iconUrl);
    final letter = squad.name.isNotEmpty ? squad.name[0].toUpperCase() : '?';

    return Transform.scale(
      scale: scale.clamp(0.82, 1.0),
      alignment: Alignment.bottomCenter,
      child: Semantics(
        label: squad.name,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: colors.card,
            border: Border.all(color: borderColor, width: 2),
            boxShadow: [
              BoxShadow(
                color: colors.shadow.withValues(alpha: 0.08),
                offset: const Offset(1, 1),
                blurRadius: 0,
              ),
            ],
          ),
          clipBehavior: Clip.hardEdge,
          child: iconUrl.isNotEmpty
              ? Image.network(
                  iconUrl,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: double.infinity,
                  errorBuilder: (_, _, _) =>
                      ProfileSquadLogoLetterFallback(letter: letter, size: size),
                )
              : ProfileSquadLogoLetterFallback(letter: letter, size: size),
        ),
      ),
    );
  }
}

class ProfileSquadLogo extends StatelessWidget {
  const ProfileSquadLogo({
    super.key,
    required this.squad,
    required this.size,
    required this.colors,
  });

  final SquadSummary squad;
  final double size;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final iconUrl = resolveProfileMediaUrl(squad.iconUrl);
    final letter = squad.name.isNotEmpty ? squad.name[0].toUpperCase() : '?';
    final borderColor = profileSquadStackBorder(colors);

    return Semantics(
      label: squad.name,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: colors.card,
          border: Border.all(color: borderColor, width: 2),
          boxShadow: [
            BoxShadow(
              color: colors.shadow.withValues(alpha: 0.08),
              offset: const Offset(1, 1),
              blurRadius: 0,
            ),
          ],
        ),
        clipBehavior: Clip.hardEdge,
        child: iconUrl.isNotEmpty
            ? Image.network(
                iconUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => ProfileSquadLogoLetterFallback(letter: letter, size: size),
              )
            : ProfileSquadLogoLetterFallback(letter: letter, size: size),
      ),
    );
  }
}

class ProfileStackOverflowBadge extends StatelessWidget {
  const ProfileStackOverflowBadge({
    super.key,
    required this.count,
    required this.size,
    required this.borderColor,
    required this.colors,
  });

  final int count;
  final double size;
  final Color borderColor;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final label = '+$count';

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colors.muted.withValues(alpha: 0.35),
        border: Border.all(color: borderColor, width: 2),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.08),
            offset: const Offset(1, 1),
            blurRadius: 0,
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: GoogleFonts.jetBrainsMono(
          fontSize: count > 99 ? 9 : 11,
          fontWeight: FontWeight.w900,
          color: primary,
        ),
      ),
    );
  }
}

class ProfileSquadLogoLetterFallback extends StatelessWidget {
  const ProfileSquadLogoLetterFallback({super.key, required this.letter, required this.size});

  final String letter;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFFFCD34D),
      child: Center(
        child: Text(
          letter,
          style: GoogleFonts.inter(
            fontSize: size * 0.43,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF042F2E),
          ),
        ),
      ),
    );
  }
}
