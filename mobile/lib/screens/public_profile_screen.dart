import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/user_summary.dart';
import '../services/auth_api.dart';
import '../services/follow_api.dart';
import '../state/auth_state.dart';
import '../theme/app_color_tokens.dart';
import '../widgets/navigation/screen_app_bar.dart';
import '../widgets/profile/profile_followed_squads_stack.dart';
import '../widgets/profile/profile_header.dart';
import '../widgets/profile/profile_overview_panel.dart';
import '../widgets/profile/profile_overview_skeleton.dart';
import '../widgets/ui/app_feedback_toast.dart';
import '../widgets/ui/app_pull_to_refresh.dart';
import '../widgets/ui/follow_toggle_button.dart';

/// Public profile — mirrors web `/u/:username` using account profile chrome.
class PublicProfileScreen extends StatefulWidget {
  const PublicProfileScreen({
    super.key,
    required this.username,
    this.preview,
  });

  final String username;
  final UserSummary? preview;

  @override
  State<PublicProfileScreen> createState() => _PublicProfileScreenState();
}

class _PublicProfileScreenState extends State<PublicProfileScreen> {
  final _api = FollowApi();
  final _overviewKey = GlobalKey<ProfileOverviewPanelState>();
  final _followedSquadsKey = GlobalKey<ProfileFollowedSquadsStackState>();
  final _scrollController = ScrollController();

  UserSummary? _user;
  bool _loading = true;
  String? _error;
  bool _following = false;
  bool _followBusy = false;

  @override
  void initState() {
    super.initState();
    _user = widget.preview;
    _load();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  bool get _isSelf {
    final me = context.read<AuthState>().user?.username?.trim().toLowerCase();
    return me != null && me == widget.username.trim().toLowerCase();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final result = await _api.getPublicProfile(widget.username);
      if (!mounted) return;

      var following = false;
      final token = context.read<AuthState>().accessToken;
      if (token != null && token.isNotEmpty && !_isSelf) {
        following = await _api.checkFollowing(
          username: widget.username,
          bearer: token,
        );
      }

      if (!mounted) return;
      setState(() {
        _user = result.user;
        _following = following;
        _loading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load profile.';
        _loading = false;
      });
    }
  }

  Future<void> _onRefresh() async {
    await _load(silent: true);
    _overviewKey.currentState?.reload();
    _followedSquadsKey.currentState?.reload();
  }

  Future<void> _toggleFollow() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.warning(context, 'Sign in to follow users.');
      return;
    }
    if (_isSelf || _followBusy) return;

    setState(() => _followBusy = true);
    try {
      if (_following) {
        await _api.unfollow(username: widget.username, bearer: token);
        if (!mounted) return;
        setState(() => _following = false);
        AppFeedbackToast.success(context, 'Unfollowed');
      } else {
        await _api.follow(username: widget.username, bearer: token);
        if (!mounted) return;
        setState(() => _following = true);
        AppFeedbackToast.success(context, 'Following');
      }
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not update follow status.');
    } finally {
      if (mounted) setState(() => _followBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final displayName = (_user?.displayName ?? widget.preview?.displayName ?? widget.username)
        .toUpperCase();

    return Scaffold(
      backgroundColor: colors.background,
      appBar: ScreenAppBar(title: displayName),
      body: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loading && _user == null) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: const [
          SizedBox(height: 112),
          SizedBox(height: 52),
          ProfileOverviewSkeleton(sectionCount: 4),
        ],
      );
    }

    if (_error != null && _user == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.person_off_outlined, size: 40, color: context.appColors.mutedForeground),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: context.appColors.mutedForeground),
              ),
              const SizedBox(height: 16),
              TextButton(onPressed: _load, child: const Text('Try again')),
            ],
          ),
        ),
      );
    }

    final user = _user;
    if (user == null) {
      return const SizedBox.shrink();
    }

    return AppPullToRefresh(
      onRefresh: _onRefresh,
      child: CustomScrollView(
        controller: _scrollController,
        physics: AppPullToRefresh.scrollPhysics,
        slivers: [
          SliverToBoxAdapter(
            child: ProfileHeader(
              user: user,
              followedSquadsKey: _followedSquadsKey,
              squadsUsername: widget.username,
              showFollowedCategories: false,
              headerAction: _isSelf
                  ? null
                  : FollowToggleButton(
                      isFollowing: _following,
                      busy: _followBusy,
                      unfollowLabel: 'FOLLOWING',
                      onPressed: _toggleFollow,
                    ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 96),
              child: ProfileOverviewPanel(
                key: _overviewKey,
                user: user,
                loading: _loading,
                pageScrollController: _scrollController,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
