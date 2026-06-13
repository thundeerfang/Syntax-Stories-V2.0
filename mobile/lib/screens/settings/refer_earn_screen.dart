import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../services/account_prefetch.dart';
import '../../services/invite_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

class ReferEarnScreen extends StatefulWidget {
  const ReferEarnScreen({super.key});

  @override
  State<ReferEarnScreen> createState() => _ReferEarnScreenState();
}

class _ReferEarnScreenState extends State<ReferEarnScreen> {
  InviteMe? _me;
  InviteStats? _stats;
  List<ReferredUser> _referred = [];
  int _referredTotal = 0;
  bool _loading = true;
  String? _error;
  String? _copiedKind;

  @override
  void initState() {
    super.initState();
    if (AccountPrefetch.hasReferData) {
      _applyPrefetch();
      _loading = false;
    }
    _load(silent: AccountPrefetch.hasReferData);
  }

  void _applyPrefetch() {
    _me = AccountPrefetch.inviteMe;
    _stats = AccountPrefetch.inviteStats;
    _referred = AccountPrefetch.referred;
    _referredTotal = AccountPrefetch.referredTotal;
  }

  Future<void> _load({bool silent = false}) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Not signed in';
      });
      return;
    }

    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    await AccountPrefetch.prefetch(token);

    if (!mounted) return;
    setState(() {
      _applyPrefetch();
      _loading = false;
      if (_me == null) _error = 'Could not load your invite link.';
    });
  }

  Future<void> _copy(String text, String kind) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    setState(() => _copiedKind = kind);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          kind == 'code' ? 'Referral code copied' : 'Invite link copied',
          style: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
    Future<void>.delayed(const Duration(seconds: 2), () {
      if (mounted && _copiedKind == kind) setState(() => _copiedKind = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: AppBar(
        backgroundColor: context.appColors.background,
        foregroundColor: context.appColors.foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          'REFER & EARN',
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: context.appColors.primary))
          : AppPullToRefresh(
              onRefresh: () => _load(),
              child: ListView(
                physics: AppPullToRefresh.scrollPhysics,
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  Text(
                    'Share your link. Friends who sign up through your URL count toward your roster.',
                    style: GoogleFonts.inter(fontSize: 14, height: 1.45, color: context.appColors.mutedForeground),
                  ),
                  const SizedBox(height: 20),
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: context.appColors.destructive.withValues(alpha: 0.08),
                        border: Border.all(color: context.appColors.destructive.withValues(alpha: 0.45), width: 2),
                      ),
                      child: Text(_error!, style: GoogleFonts.inter(color: context.appColors.destructive)),
                    ),
                  if (_me != null) ...[
                    _CopyBlock(
                      label: 'Invite URL',
                      value: _me!.inviteUrl,
                      copied: _copiedKind == 'link',
                      onCopy: () => _copy(_me!.inviteUrl, 'link'),
                    ),
                    if (_me!.referralCode.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      _CopyBlock(
                        label: 'Referral code',
                        value: _me!.referralCode,
                        copied: _copiedKind == 'code',
                        onCopy: () => _copy(_me!.referralCode, 'code'),
                        mono: true,
                      ),
                    ],
                  ],
                  const SizedBox(height: 20),
                  _StatsRow(stats: _stats, referredTotal: _referredTotal),
                  const SizedBox(height: 20),
                  Text(
                    'YOUR REFERRALS',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.4,
                      color: context.appColors.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (_referred.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: context.appColors.muted.withValues(alpha: 0.08),
                        border: Border.all(color: context.appColors.border.withValues(alpha: 0.45), width: 2),
                      ),
                      child: Text(
                        'No referrals yet. Copy your invite link above.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(color: context.appColors.mutedForeground),
                      ),
                    )
                  else
                    ..._referred.map((row) => _ReferredRow(user: row)),
                ],
              ),
            ),
    );
  }
}

class _CopyBlock extends StatelessWidget {
  const _CopyBlock({
    required this.label,
    required this.value,
    required this.copied,
    required this.onCopy,
    this.mono = false,
  });

  final String label;
  final String value;
  final bool copied;
  final VoidCallback onCopy;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: context.appColors.mutedForeground,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  color: context.appColors.muted.withValues(alpha: 0.2),
                  border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
                ),
                child: Text(
                  value,
                  style: (mono ? GoogleFonts.jetBrainsMono : GoogleFonts.inter)(
                    fontSize: mono ? 13 : 12,
                    fontWeight: mono ? FontWeight.w700 : FontWeight.w600,
                    height: 1.35,
                    color: context.appColors.foreground,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _CopyButton(copied: copied, onTap: onCopy),
          ],
        ),
      ],
    );
  }
}

class _CopyButton extends StatelessWidget {
  const _CopyButton({required this.copied, required this.onTap});

  final bool copied;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.appColors.primary,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                copied ? Icons.check_rounded : Icons.copy_rounded,
                size: 16,
                color: Colors.white,
              ),
              const SizedBox(width: 6),
              Text(
                copied ? 'COPIED' : 'COPY',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats, required this.referredTotal});

  final InviteStats? stats;
  final int referredTotal;

  @override
  Widget build(BuildContext context) {
    final converted = stats?.converted ?? referredTotal;
    final pending = stats?.pending ?? 0;
    final rewarded = stats?.rewarded ?? 0;

    return Row(
      children: [
        Expanded(child: _StatTile(label: 'Converted', value: converted)),
        const SizedBox(width: 8),
        Expanded(child: _StatTile(label: 'Pending', value: pending)),
        const SizedBox(width: 8),
        Expanded(child: _StatTile(label: 'Rewarded', value: rewarded)),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Column(
        children: [
          Text(
            '$value',
            style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w900, color: context.appColors.primary),
          ),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: context.appColors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReferredRow extends StatelessWidget {
  const _ReferredRow({required this.user});

  final ReferredUser user;

  @override
  Widget build(BuildContext context) {
    final img = resolveProfileMediaUrl(user.profileImg);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
            ),
            clipBehavior: Clip.hardEdge,
            child: img.isNotEmpty
                ? Image.network(img, fit: BoxFit.cover)
                : ColoredBox(
                    color: context.appColors.muted.withValues(alpha: 0.35),
                    child: Icon(Icons.person_outline, color: context.appColors.mutedForeground),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.fullName.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900),
                ),
                Text(
                  '@${user.username}',
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: context.appColors.primary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
