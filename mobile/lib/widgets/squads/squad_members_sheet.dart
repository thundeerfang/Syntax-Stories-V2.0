import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/squad_member.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';

String squadRoleLabelPublic(String role) {
  if (role == 'admin') return 'Admin';
  if (role == 'moderator') return 'Moderator';
  return 'Member';
}

List<SquadMember> sortSquadStaff(List<SquadMember> members, {String? creatorUserId}) {
  final staff = members.where((m) => m.isStaff).toList();
  staff.sort((a, b) {
    final aCreator = creatorUserId != null && a.userId == creatorUserId ? 0 : 1;
    final bCreator = creatorUserId != null && b.userId == creatorUserId ? 0 : 1;
    if (aCreator != bCreator) return aCreator - bCreator;
    const order = {'admin': 0, 'moderator': 1, 'member': 2};
    return (order[a.role] ?? 2).compareTo(order[b.role] ?? 2);
  });
  return staff;
}

List<SquadMember> shuffleMembersWithSeed(List<SquadMember> members, String seed) {
  final out = [...members];
  var h = 2166136261;
  for (var i = 0; i < seed.length; i++) {
    h = (h ^ seed.codeUnitAt(i)) * 16777619;
  }
  for (var i = out.length - 1; i > 0; i--) {
    h = (h ^ (h >> 16)) * 2246822507;
    h = (h ^ (h >> 13)) * 3266489909;
    final j = (h.abs()) % (i + 1);
    final tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

String formatSquadCreated(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final d = DateTime.tryParse(iso);
  if (d == null) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${months[d.month - 1]} ${d.year}';
}

Color _sheetDividerColor(AppColorTokens colors) =>
    colors.foreground.withValues(alpha: 0.12);

Future<void> showSquadMembersSheet(
  BuildContext context, {
  required List<SquadMember> members,
  String? creatorUserId,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    enableDrag: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.45),
    builder: (context) => _SquadMembersSheet(
      members: members,
      creatorUserId: creatorUserId,
    ),
  );
}

class _SquadMembersSheet extends StatefulWidget {
  const _SquadMembersSheet({
    required this.members,
    this.creatorUserId,
  });

  final List<SquadMember> members;
  final String? creatorUserId;

  @override
  State<_SquadMembersSheet> createState() => _SquadMembersSheetState();
}

class _SquadMembersSheetState extends State<_SquadMembersSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      final next = _searchController.text.trim().toLowerCase();
      if (next == _query) return;
      setState(() => _query = next);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<SquadMember> _filterMembers(List<SquadMember> source) {
    if (_query.isEmpty) return source;
    return source.where((m) {
      final hay = '${m.username} ${m.fullName}'.toLowerCase();
      return hay.contains(_query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final divider = _sheetDividerColor(colors);
    final filtered = _filterMembers(widget.members);
    final staff = sortSquadStaff(filtered, creatorUserId: widget.creatorUserId);
    final regular = filtered.where((m) => !m.isStaff).toList()
      ..sort((a, b) => a.username.compareTo(b.username));

    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.35,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: colors.card,
            border: Border(
              top: BorderSide(color: colors.border, width: 2),
              left: BorderSide(color: colors.border, width: 2),
              right: BorderSide(color: colors.border, width: 2),
            ),
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: divider,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _MembersSearchField(controller: _searchController),
              ),
              const SizedBox(height: 12),
              Divider(height: 1, thickness: 1, color: divider),
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          widget.members.isEmpty
                              ? 'No members listed.'
                              : 'No members match your search.',
                          style: GoogleFonts.inter(color: colors.mutedForeground),
                        ),
                      )
                    : ListView(
                        controller: scrollController,
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
                        children: [
                          if (staff.isNotEmpty) ...[
                            _MembersSectionHeader(
                              icon: Icons.shield_outlined,
                              label: 'Admins & moderators',
                              iconColor: primary,
                            ),
                            const SizedBox(height: 8),
                            ...staff.map(
                              (member) => _MemberRow(
                                member: member,
                                colors: colors,
                                primary: primary,
                                showRoleBadge: true,
                              ),
                            ),
                          ],
                          if (staff.isNotEmpty && regular.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            Divider(height: 1, thickness: 1, color: divider),
                            const SizedBox(height: 16),
                          ],
                          if (regular.isNotEmpty) ...[
                            _MembersSectionHeader(
                              icon: Icons.groups_outlined,
                              label: 'Members',
                              iconColor: colors.foreground,
                            ),
                            const SizedBox(height: 8),
                            ...regular.map(
                              (member) => _MemberRow(
                                member: member,
                                colors: colors,
                                primary: primary,
                                showRoleBadge: false,
                              ),
                            ),
                          ],
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MembersSearchField extends StatelessWidget {
  const _MembersSearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final hasText = controller.text.isNotEmpty;

    return TextField(
      controller: controller,
      autocorrect: false,
      enableSuggestions: false,
      style: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: colors.foreground,
      ),
      decoration: InputDecoration(
        isDense: true,
        filled: true,
        fillColor: colors.background,
        hintText: 'Search…',
        hintStyle: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: colors.mutedForeground.withValues(alpha: 0.65),
        ),
        prefixIcon: Icon(Icons.search_rounded, size: 18, color: primary),
        prefixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 40),
        suffixIcon: hasText
            ? IconButton(
                onPressed: controller.clear,
                icon: Icon(Icons.close_rounded, size: 18, color: colors.mutedForeground),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              )
            : null,
        contentPadding: const EdgeInsets.symmetric(vertical: 12),
        border: OutlineInputBorder(
          borderSide: BorderSide(color: colors.border, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: colors.border, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: primary, width: 2),
        ),
      ),
    );
  }
}

class _MembersSectionHeader extends StatelessWidget {
  const _MembersSectionHeader({
    required this.icon,
    required this.label,
    required this.iconColor,
  });

  final IconData icon;
  final String label;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Row(
      children: [
        Icon(icon, size: 16, color: iconColor),
        const SizedBox(width: 8),
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.1,
            color: colors.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({
    required this.member,
    required this.colors,
    required this.primary,
    required this.showRoleBadge,
  });

  final SquadMember member;
  final AppColorTokens colors;
  final Color primary;
  final bool showRoleBadge;

  @override
  Widget build(BuildContext context) {
    final avatar = resolveProfileMediaUrl(member.profileImg);
    final displayName =
        member.fullName.trim().isNotEmpty ? member.fullName.trim() : member.username;
    final divider = _sheetDividerColor(colors);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: divider, width: 1)),
      ),
      child: Row(
        children: [
          _MemberAvatar(url: avatar, username: member.username, colors: colors),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: colors.foreground,
                  ),
                ),
                if (member.username.isNotEmpty)
                  Text(
                    '@${member.username}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: colors.mutedForeground,
                    ),
                  ),
              ],
            ),
          ),
          if (showRoleBadge)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                border: Border.all(
                  color: member.role == 'moderator'
                      ? const Color(0xFFFFB000).withValues(alpha: 0.5)
                      : primary.withValues(alpha: 0.5),
                  width: 1.5,
                ),
                color: member.role == 'moderator'
                    ? const Color(0xFFFFB000).withValues(alpha: 0.12)
                    : primary.withValues(alpha: 0.12),
              ),
              child: Text(
                squadRoleLabelPublic(member.role).toUpperCase(),
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 8,
                  fontWeight: FontWeight.w800,
                  color: member.role == 'moderator'
                      ? const Color(0xFFB88600)
                      : primary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MemberAvatar extends StatelessWidget {
  const _MemberAvatar({
    required this.url,
    required this.username,
    required this.colors,
  });

  final String url;
  final String username;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final initial = username.isNotEmpty ? username[0].toUpperCase() : '?';
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
        color: colors.muted,
      ),
      clipBehavior: Clip.antiAlias,
      child: url.isNotEmpty
          ? Image.network(url, fit: BoxFit.cover, errorBuilder: (_, _, _) => _fallback(initial))
          : _fallback(initial),
    );
  }

  Widget _fallback(String initial) {
    return Center(
      child: Text(
        initial,
        style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: colors.foreground),
      ),
    );
  }
}

class SquadFacepile extends StatelessWidget {
  const SquadFacepile({
    super.key,
    required this.members,
    this.size = 28,
  });

  final List<SquadMember> members;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) return const SizedBox.shrink();
    final colors = context.appColors;
    final overlap = size * 0.35;
    return SizedBox(
      width: size + (members.length - 1) * (size - overlap),
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < members.length; i++)
            Positioned(
              left: i * (size - overlap),
              child: _SizedMemberAvatar(
                size: size,
                url: resolveProfileMediaUrl(members[i].profileImg),
                username: members[i].username,
                colors: colors,
              ),
            ),
        ],
      ),
    );
  }
}

class _SizedMemberAvatar extends StatelessWidget {
  const _SizedMemberAvatar({
    required this.size,
    required this.url,
    required this.username,
    required this.colors,
  });

  final double size;
  final String url;
  final String username;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final initial = username.isNotEmpty ? username[0].toUpperCase() : '?';
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
        color: colors.muted,
      ),
      clipBehavior: Clip.antiAlias,
      child: url.isNotEmpty
          ? Image.network(url, fit: BoxFit.cover, errorBuilder: (_, _, _) => _fallback(initial))
          : _fallback(initial),
    );
  }

  Widget _fallback(String initial) {
    return Center(
      child: Text(
        initial,
        style: GoogleFonts.inter(
          fontSize: size * 0.38,
          fontWeight: FontWeight.w900,
          color: colors.foreground,
        ),
      ),
    );
  }
}

class SquadStaffChip extends StatelessWidget {
  const SquadStaffChip({
    super.key,
    required this.member,
    this.onTap,
  });

  final SquadMember member;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final avatar = resolveProfileMediaUrl(member.profileImg);
    final label = member.fullName.trim().isNotEmpty ? member.fullName.trim() : member.username;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white.withValues(alpha: 0.35), width: 2),
            color: Colors.black.withValues(alpha: 0.35),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: _MemberAvatar(url: avatar, username: member.username, colors: colors),
              ),
              const SizedBox(width: 4),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 88),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Text(
                squadRoleLabelPublic(member.role).toUpperCase(),
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 7,
                  fontWeight: FontWeight.w900,
                  color: primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
