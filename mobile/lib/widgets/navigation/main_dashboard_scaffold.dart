import 'package:flutter/material.dart';

import 'curved_bottom_nav_bar.dart';
import 'main_app_bar.dart';
import 'main_nav_config.dart';

/// Shared dashboard chrome: top app bar, body slot, curved bottom nav.
///
/// The top bar hides only when the active tab has real scroll room below the
/// fold. It snaps fully in or out — never stuck halfway.
class MainDashboardScaffold extends StatefulWidget {
  const MainDashboardScaffold({
    super.key,
    required this.title,
    required this.selectedTab,
    required this.onNavTap,
    required this.body,
    required this.onSearch,
    required this.onNotifications,
    required this.onSettings,
    this.onCreate,
    this.showNotifications = true,
    this.notificationUnreadCount = 0,
  });

  final String title;
  final MainTab selectedTab;
  final ValueChanged<int> onNavTap;
  final Widget body;
  final VoidCallback onSearch;
  final VoidCallback onNotifications;
  final VoidCallback onSettings;
  final VoidCallback? onCreate;
  final bool showNotifications;
  final int notificationUnreadCount;

  @override
  State<MainDashboardScaffold> createState() => _MainDashboardScaffoldState();
}

class _MainDashboardScaffoldState extends State<MainDashboardScaffold>
    with SingleTickerProviderStateMixin {
  static const _animDuration = Duration(milliseconds: 200);
  static const _minExtraScrollToHide = 48.0;
  static const _hideAccumulation = 28.0;
  static const _showAccumulation = 14.0;
  static const _toggleCooldown = Duration(milliseconds: 280);

  AnimationController? _navVisibility;
  double _maxAppBarHide = 0;
  double _directionalScrollDelta = 0;
  DateTime? _lastNavToggle;

  AnimationController get _nav {
    _ensureNavController();
    return _navVisibility!;
  }

  bool get _isNavShown => _nav.value > 0.5;

  void _ensureNavController() {
    _navVisibility ??= AnimationController(
      vsync: this,
      duration: _animDuration,
      value: 1,
    );
  }

  @override
  void initState() {
    super.initState();
    _ensureNavController();
  }

  @override
  void reassemble() {
    super.reassemble();
    _ensureNavController();
  }

  @override
  void didUpdateWidget(MainDashboardScaffold oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedTab != widget.selectedTab) {
      _directionalScrollDelta = 0;
      _showNav(immediate: true);
    }
  }

  @override
  void dispose() {
    _navVisibility?.dispose();
    super.dispose();
  }

  bool _hasScrollRoom(ScrollMetrics metrics) {
    return metrics.maxScrollExtent > _minExtraScrollToHide;
  }

  void _resetScrollTracking() {
    _directionalScrollDelta = 0;
  }

  bool _canToggleNav() {
    if (_nav.isAnimating) return false;
    final last = _lastNavToggle;
    if (last == null) return true;
    return DateTime.now().difference(last) >= _toggleCooldown;
  }

  void _showNav({bool immediate = false}) {
    if (_nav.value >= 1) return;
    if (immediate) {
      _nav.value = 1;
      _resetScrollTracking();
      return;
    }
    if (!_canToggleNav()) return;
    _lastNavToggle = DateTime.now();
    _nav.forward();
    _resetScrollTracking();
  }

  void _hideNav(ScrollMetrics metrics) {
    if (!_hasScrollRoom(metrics) || _nav.value <= 0) return;
    if (!_canToggleNav()) return;
    _lastNavToggle = DateTime.now();
    _nav.reverse();
    _resetScrollTracking();
  }

  void _applyScrollDelta(double delta, ScrollMetrics metrics) {
    if (delta == 0) return;

    if (!_hasScrollRoom(metrics) || metrics.pixels <= metrics.minScrollExtent + 0.5) {
      _showNav();
      return;
    }

    if ((_directionalScrollDelta > 0 && delta < 0) ||
        (_directionalScrollDelta < 0 && delta > 0)) {
      _directionalScrollDelta = 0;
    }
    _directionalScrollDelta += delta;

    if (_isNavShown && _directionalScrollDelta >= _hideAccumulation) {
      _hideNav(metrics);
    } else if (!_isNavShown && _directionalScrollDelta <= -_showAccumulation) {
      _showNav();
    }
  }

  bool _handleScroll(ScrollNotification notification) {
    if (notification.metrics.axis != Axis.vertical) {
      return false;
    }

    final metrics = notification.metrics;

    if (notification is ScrollEndNotification) {
      _resetScrollTracking();
      if (metrics.pixels <= metrics.minScrollExtent + 0.5) {
        _showNav();
      }
      return false;
    }

    if (notification is ScrollUpdateNotification) {
      final delta = notification.scrollDelta;
      if (delta != null) {
        if (metrics.pixels <= metrics.minScrollExtent + 0.5 && delta < 0) {
          return false;
        }
        _applyScrollDelta(delta, metrics);
      }
    }

    return false;
  }

  @override
  Widget build(BuildContext context) {
    _ensureNavController();
    _maxAppBarHide = MainAppBar.totalHeight(context);

    return Scaffold(
      extendBody: true,
      body: Stack(
        clipBehavior: Clip.hardEdge,
        fit: StackFit.expand,
        children: [
          NotificationListener<ScrollNotification>(
            onNotification: _handleScroll,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: widget.body,
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: _maxAppBarHide,
            child: AnimatedBuilder(
              animation: _nav,
              builder: (context, child) {
                final visible = _nav.value;
                return IgnorePointer(
                  ignoring: visible < 0.05,
                  child: Transform.translate(
                    offset: Offset(0, -_maxAppBarHide * (1 - visible)),
                    child: child,
                  ),
                );
              },
              child: MainAppBar(
                title: widget.title,
                onSearch: widget.onSearch,
                onNotifications: widget.onNotifications,
                onSettings: widget.onSettings,
                onCreate: widget.onCreate,
                showNotifications: widget.showNotifications,
                notificationUnreadCount: widget.notificationUnreadCount,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: CurvedBottomNavBar(
        items: MainNavConfig.bottomItems,
        selectedIndex: MainNavConfig.bottomIndexFor(widget.selectedTab),
        onTap: widget.onNavTap,
      ),
    );
  }
}
