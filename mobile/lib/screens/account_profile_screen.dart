import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/account_prefetch.dart';
import '../state/auth_state.dart';
import '../widgets/navigation/main_app_bar.dart';
import '../widgets/profile/profile_followed_categories_stack.dart';
import '../widgets/profile/profile_followed_squads_stack.dart';
import '../widgets/profile/profile_content_tabs.dart';
import '../widgets/profile/profile_header.dart';
import '../widgets/ui/app_pull_to_refresh.dart';

class AccountProfileScreen extends StatefulWidget {
  const AccountProfileScreen({super.key});

  @override
  State<AccountProfileScreen> createState() => _AccountProfileScreenState();
}

class _AccountProfileScreenState extends State<AccountProfileScreen> {
  final _contentTabsKey = GlobalKey<ProfileContentTabsState>();
  final _followedSquadsKey = GlobalKey<ProfileFollowedSquadsStackState>();
  final _followedCategoriesKey = GlobalKey<ProfileFollowedCategoriesStackState>();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) return;
    await context.read<AuthState>().refreshUser();
    await AccountPrefetch.prefetch(token);
    _contentTabsKey.currentState?.reloadActiveTab();
    _followedSquadsKey.currentState?.reload();
    _followedCategoriesKey.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final user = auth.user;
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final topInset = MainAppBar.totalHeight(context);
    const navReserve = 96.0;

    return AppPullToRefresh(
      onRefresh: _onRefresh,
      edgeOffset: topInset,
      displacement: 40,
      child: CustomScrollView(
        controller: _scrollController,
        physics: AppPullToRefresh.scrollPhysics,
        slivers: [
          SliverToBoxAdapter(child: SizedBox(height: topInset)),
          SliverToBoxAdapter(
            child: ProfileHeader(
              user: user,
              followedSquadsKey: _followedSquadsKey,
              followedCategoriesKey: _followedCategoriesKey,
            ),
          ),
          SliverToBoxAdapter(
            child: ProfileContentTabs(
              key: _contentTabsKey,
              pageScrollController: _scrollController,
            ),
          ),
          SliverToBoxAdapter(child: SizedBox(height: bottomInset + navReserve)),
        ],
      ),
    );
  }
}
