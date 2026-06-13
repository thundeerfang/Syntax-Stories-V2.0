import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/account_prefetch.dart';
import '../state/auth_state.dart';
import '../widgets/navigation/main_app_bar.dart';
import '../widgets/profile/profile_content_tabs.dart';
import '../widgets/profile/profile_header.dart';
import '../widgets/ui/app_pull_to_refresh.dart';

class AccountProfileScreen extends StatefulWidget {
  const AccountProfileScreen({super.key});

  @override
  State<AccountProfileScreen> createState() => _AccountProfileScreenState();
}

class _AccountProfileScreenState extends State<AccountProfileScreen> {
  Future<void> _onRefresh() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) return;
    await context.read<AuthState>().refreshUser();
    await AccountPrefetch.prefetch(token);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final user = auth.user;
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final topInset = MainAppBar.totalHeight(context);

    return AppPullToRefresh(
      onRefresh: _onRefresh,
      child: ListView(
        padding: EdgeInsets.only(top: topInset, bottom: bottomInset + 96),
        physics: AppPullToRefresh.scrollPhysics,
        children: [
          ProfileHeader(user: user),
          const ProfileContentTabs(),
        ],
      ),
    );
  }
}
