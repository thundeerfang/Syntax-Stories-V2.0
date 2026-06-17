import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/syntax_card_data.dart';
import '../../services/syntax_card_loader.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/syntax_card/syntax_card_square.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/app_loading_indicator.dart';

class SyntaxCardScreen extends StatefulWidget {
  const SyntaxCardScreen({super.key});

  @override
  State<SyntaxCardScreen> createState() => _SyntaxCardScreenState();
}

class _SyntaxCardScreenState extends State<SyntaxCardScreen> {
  final _loader = SyntaxCardLoader();

  SyntaxCardData? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCard();
  }

  Future<void> _loadCard() async {
    final auth = context.read<AuthState>();
    final user = auth.user;
    final username = user?.username?.trim() ?? '';
    if (username.isEmpty) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Set a username on your profile first.';
        });
      }
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await _loader.load(
        username: username,
        fullName: user?.displayName ?? username,
        profileImg: user?.profileImg,
        coverBanner: user?.coverBanner,
        accessToken: auth.accessToken,
      );
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Could not load Syntax Card.';
      });
    }
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
    await _loadCard();
  }

  Future<void> _shareToSocial(String platform) async {
    final profileUrl = _data?.profileUrl ?? '';
    if (profileUrl.isEmpty) return;

    final text = 'My Syntax Stories dev card 🔥\n$profileUrl';
    final encodedUrl = Uri.encodeComponent(profileUrl);
    final encodedText = Uri.encodeComponent(text);

    final uri = switch (platform) {
      'x' => Uri.parse('https://twitter.com/intent/tweet?text=$encodedText'),
      'facebook' => Uri.parse('https://www.facebook.com/sharer/sharer.php?u=$encodedUrl'),
      'linkedin' => Uri.parse('https://www.linkedin.com/sharing/share-offsite/?url=$encodedUrl'),
      'instagram' => Uri.parse('https://www.instagram.com/'),
      _ => null,
    };

    if (uri == null) return;
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      AppFeedbackToast.warning(context, 'Could not open share link.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return SettingsSectionScaffold(
      title: 'Syntax card',
      description:
          'Your square developer identity card — share it on X, Instagram, Facebook, or LinkedIn.',
      icon: Icons.credit_card_outlined,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      onRefresh: _pullRefresh,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: kSyntaxCardDesignWidth / kSyntaxCardDesignHeight,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: colors.muted.withValues(alpha: 0.12),
                border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 3),
                boxShadow: [
                  BoxShadow(
                    color: colors.shadow.withValues(alpha: 0.12),
                    offset: const Offset(3, 3),
                    blurRadius: 0,
                  ),
                ],
              ),
              child: _loading
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppLoadingIndicator(color: colors.primary),
                          const SizedBox(height: 10),
                          Text(
                            'BUILDING CARD…',
                            style: GoogleFonts.jetBrainsMono(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                              color: colors.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                    )
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _error!,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(color: colors.mutedForeground),
                                ),
                                const SizedBox(height: 12),
                                TextButton(onPressed: _loadCard, child: const Text('Try again')),
                              ],
                            ),
                          ),
                        )
                      : _data == null
                          ? const SizedBox.shrink()
                          : SyntaxCardPreview(data: _data!),
            ),
          ),
          if (!_loading && _error == null && _data != null) ...[
            const SizedBox(height: 20),
            Text(
              'SHARE YOUR CARD',
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: colors.mutedForeground,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _ShareButton(
                  label: 'X / Twitter',
                  onPressed: () => _shareToSocial('x'),
                ),
                _ShareButton(
                  label: 'Facebook',
                  onPressed: () => _shareToSocial('facebook'),
                ),
                _ShareButton(
                  label: 'Instagram',
                  onPressed: () => _shareToSocial('instagram'),
                ),
                _ShareButton(
                  label: 'LinkedIn',
                  onPressed: () => _shareToSocial('linkedin'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ShareButton extends StatelessWidget {
  const _ShareButton({
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Material(
      color: colors.card,
      child: InkWell(
        onTap: onPressed,
        child: Container(
          constraints: const BoxConstraints(minWidth: 148),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
          ),
          child: Text(
            label.toUpperCase(),
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
              color: colors.foreground,
            ),
          ),
        ),
      ),
    );
  }
}
