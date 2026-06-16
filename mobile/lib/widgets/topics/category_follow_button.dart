import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../ui/app_feedback_toast.dart';
import '../ui/follow_toggle_button.dart';

/// Category follow toggle — mirrors webapp `CategoryFollowButton`.
class CategoryFollowButton extends StatefulWidget {
  const CategoryFollowButton({
    super.key,
    required this.slug,
    required this.name,
    this.compact = false,
    this.onToggle,
  });

  final String slug;
  final String name;
  final bool compact;
  final ValueChanged<bool>? onToggle;

  @override
  State<CategoryFollowButton> createState() => _CategoryFollowButtonState();
}

class _CategoryFollowButtonState extends State<CategoryFollowButton> {
  final _api = BlogApi();

  bool _following = false;
  bool _busy = false;
  bool _synced = false;

  @override
  void initState() {
    super.initState();
    _syncFollowing();
  }

  @override
  void didUpdateWidget(covariant CategoryFollowButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.slug != widget.slug) _syncFollowing();
  }

  Future<void> _syncFollowing() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _following = false;
          _synced = true;
        });
      }
      return;
    }

    try {
      final slugs = await _api.listFollowedCategories(accessToken: token);
      if (!mounted) return;
      setState(() {
        _following = slugs.contains(widget.slug.trim().toLowerCase());
        _synced = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _synced = true);
    }
  }

  Future<void> _toggle() async {
    final auth = context.read<AuthState>();
    final token = auth.accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.warning(context, 'Sign in to follow categories.');
      return;
    }
    if (_busy) return;

    setState(() => _busy = true);
    try {
      if (_following) {
        await _api.unfollowCategory(slug: widget.slug, accessToken: token);
        if (!mounted) return;
        setState(() => _following = false);
        AppFeedbackToast.success(context, 'Unfollowed ${widget.name}');
        widget.onToggle?.call(false);
      } else {
        await _api.followCategory(slug: widget.slug, accessToken: token);
        if (!mounted) return;
        setState(() => _following = true);
        AppFeedbackToast.success(context, 'Following ${widget.name}');
        widget.onToggle?.call(true);
      }
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
      await _syncFollowing();
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not update follow status.');
      await _syncFollowing();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_synced) {
      return SizedBox(
        width: widget.compact ? 72 : 88,
        height: widget.compact ? 28 : 32,
        child: Center(
          child: SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ),
      );
    }

    return FollowToggleButton(
      isFollowing: _following,
      busy: _busy,
      compact: widget.compact,
      followLabel: 'FOLLOW',
      unfollowLabel: 'UNFOLLOW',
      onPressed: _toggle,
    );
  }
}
