import 'package:flutter/material.dart';

import 'profile_followed_categories_stack.dart';
import 'profile_followed_squads_stack.dart';

/// Squads stack (left) and followed categories button (right) above the profile bio.
class ProfileFollowedInterestsRow extends StatelessWidget {
  const ProfileFollowedInterestsRow({
    super.key,
    this.squadsKey,
    this.categoriesKey,
    this.horizontalPadding = 20,
    this.squadsUsername,
    this.showFollowedCategories = true,
  });

  final GlobalKey<ProfileFollowedSquadsStackState>? squadsKey;
  final GlobalKey<ProfileFollowedCategoriesStackState>? categoriesKey;
  final double horizontalPadding;
  /// When set, loads squads for this profile instead of the signed-in user.
  final String? squadsUsername;
  final bool showFollowedCategories;

  @override
  Widget build(BuildContext context) {
    final squads = ProfileFollowedSquadsStack(
      key: squadsKey,
      embedded: true,
      username: squadsUsername,
    );

    if (!showFollowedCategories) {
      return Padding(
        padding: EdgeInsets.fromLTRB(horizontalPadding, 0, horizontalPadding, 12),
        child: Align(
          alignment: Alignment.centerLeft,
          child: squads,
        ),
      );
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(horizontalPadding, 0, horizontalPadding, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Align(
              alignment: Alignment.centerLeft,
              child: squads,
            ),
          ),
          ProfileFollowedCategoriesStack(
            key: categoriesKey,
            embedded: true,
          ),
        ],
      ),
    );
  }
}
