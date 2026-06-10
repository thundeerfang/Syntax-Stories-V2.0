import 'package:flutter/material.dart' show Icons;

import 'curved_bottom_nav_bar.dart';

enum MainTab { home, trending, squads, account }

/// Single source of truth for main dashboard tabs + bottom nav.
abstract final class MainNavConfig {
  static const writeIndex = 2;

  static const bottomItems = [
    CurvedBottomNavItem(
      outlineIcon: Icons.home_outlined,
      filledIcon: Icons.home,
      label: 'Home',
    ),
    CurvedBottomNavItem(
      outlineIcon: Icons.local_fire_department_outlined,
      filledIcon: Icons.local_fire_department_rounded,
      label: 'Trending',
    ),
    CurvedBottomNavItem(
      outlineIcon: Icons.add,
      filledIcon: Icons.add,
      label: 'Write',
      isWriteAction: true,
    ),
    CurvedBottomNavItem(
      outlineIcon: Icons.groups_outlined,
      filledIcon: Icons.groups_rounded,
      label: 'Squads',
    ),
    CurvedBottomNavItem(
      outlineIcon: Icons.person_outline_rounded,
      filledIcon: Icons.person_rounded,
      label: 'Account',
    ),
  ];

  static String titleFor(MainTab tab) {
    return switch (tab) {
      MainTab.home => 'Home',
      MainTab.trending => 'Trending',
      MainTab.squads => 'Squads',
      MainTab.account => 'Account',
    };
  }

  static int bottomIndexFor(MainTab tab) {
    return switch (tab) {
      MainTab.home => 0,
      MainTab.trending => 1,
      MainTab.squads => 3,
      MainTab.account => 4,
    };
  }

  static int stackIndexFor(MainTab tab) {
    return switch (tab) {
      MainTab.home => 0,
      MainTab.trending => 1,
      MainTab.squads => 2,
      MainTab.account => 3,
    };
  }

  static MainTab tabForStackIndex(int index) {
    return switch (index) {
      0 => MainTab.home,
      1 => MainTab.trending,
      2 => MainTab.squads,
      3 => MainTab.account,
      _ => MainTab.home,
    };
  }

  static MainTab? tabForBottomIndex(int index) {
    return switch (index) {
      0 => MainTab.home,
      1 => MainTab.trending,
      3 => MainTab.squads,
      4 => MainTab.account,
      _ => null,
    };
  }
}
