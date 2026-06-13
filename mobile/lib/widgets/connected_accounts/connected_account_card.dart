import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../services/oauth_urls.dart';
import '../../theme/app_color_tokens.dart';

/// Connected OAuth provider card — layout mirrors [SetupComponentBadge].
class ConnectedAccountCard extends StatelessWidget {
  const ConnectedAccountCard({
    super.key,
    required this.provider,
    required this.title,
    required this.linked,
    required this.busy,
    required this.onConnect,
    required this.onDisconnect,
  });

  final OAuthProvider provider;
  final String title;
  final bool linked;
  final bool busy;
  final VoidCallback? onConnect;
  final VoidCallback? onDisconnect;

  static const _iconSize = 56.0;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: linked ? colors.primary.withValues(alpha: 0.05) : colors.card,
        border: Border.all(
          color: linked
              ? colors.primary.withValues(alpha: 0.65)
              : colors.border.withValues(alpha: 0.85),
          width: 2,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _ProviderIcon(provider: provider, linked: linked),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        height: 1.25,
                        color: colors.foreground,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: linked ? colors.primary : colors.mutedForeground,
                            border: Border.all(color: colors.border, width: 1),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            linked ? 'Linked' : (busy ? 'Linking…' : 'Not connected'),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.4,
                              color: linked ? colors.primary : colors.mutedForeground,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            _AccountActionLink(
              linked: linked,
              busy: busy,
              onConnect: onConnect,
              onDisconnect: onDisconnect,
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountActionLink extends StatelessWidget {
  const _AccountActionLink({
    required this.linked,
    required this.busy,
    required this.onConnect,
    required this.onDisconnect,
  });

  final bool linked;
  final bool busy;
  final VoidCallback? onConnect;
  final VoidCallback? onDisconnect;

  static const _iconBoxSize = 36.0;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    if (busy) {
      return _ActionBox(
        backgroundColor: linked ? colors.destructive : colors.primary,
        borderColor: colors.border,
        child: SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: colors.primaryForeground,
          ),
        ),
      );
    }

    if (linked) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onDisconnect,
          child: _ActionBox(
            backgroundColor: colors.destructive,
            borderColor: colors.destructive,
            fixedSize: _iconBoxSize,
            child: Icon(
              Icons.link_off_rounded,
              size: 18,
              color: colors.primaryForeground,
            ),
          ),
        ),
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onConnect,
        child: _ActionBox(
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.link_rounded, size: 14, color: colors.primaryForeground),
              const SizedBox(width: 4),
              Text(
                'Link',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.6,
                  color: colors.primaryForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionBox extends StatelessWidget {
  const _ActionBox({
    required this.backgroundColor,
    required this.borderColor,
    required this.child,
    this.fixedSize,
    this.padding,
  });

  final Color backgroundColor;
  final Color borderColor;
  final Widget child;
  final double? fixedSize;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: fixedSize,
      height: fixedSize,
      padding: padding,
      alignment: fixedSize != null ? Alignment.center : null,
      decoration: BoxDecoration(
        color: backgroundColor,
        border: Border.all(color: borderColor.withValues(alpha: 0.85), width: 2),
      ),
      child: child,
    );
  }
}

class _ProviderIcon extends StatelessWidget {
  const _ProviderIcon({required this.provider, required this.linked});

  final OAuthProvider provider;
  final bool linked;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final monochrome = provider == OAuthProvider.x || provider == OAuthProvider.github;

    return Container(
      width: ConnectedAccountCard._iconSize,
      height: ConnectedAccountCard._iconSize,
      decoration: BoxDecoration(
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
        color: linked ? colors.primary.withValues(alpha: 0.12) : colors.muted.withValues(alpha: 0.12),
      ),
      child: Center(
        child: SvgPicture.asset(
          provider.iconAsset,
          width: 24,
          height: 24,
          colorFilter: monochrome
              ? ColorFilter.mode(
                  linked ? colors.foreground : colors.mutedForeground,
                  BlendMode.srcIn,
                )
              : null,
        ),
      ),
    );
  }
}

class ConnectedAccountCardList extends StatelessWidget {
  const ConnectedAccountCardList({
    super.key,
    required this.children,
  });

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          children[i],
          if (i < children.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}
