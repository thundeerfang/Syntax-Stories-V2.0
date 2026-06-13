import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/github_repo.dart';
import '../../models/project_item.dart';
import '../../services/auth_api.dart';
import '../../services/github_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/github_project_identity.dart';
import '../../utils/open_source_limits.dart';
import '../../utils/user_message_case.dart';
import '../auth/auth_text_field.dart';

class OpenSourceImportSheet extends StatefulWidget {
  const OpenSourceImportSheet({
    super.key,
    required this.existingProjects,
    required this.onImported,
  });

  final List<ProjectItem> existingProjects;
  final VoidCallback onImported;

  static Future<void> show(
    BuildContext context, {
    required List<ProjectItem> existingProjects,
    required VoidCallback onImported,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => OpenSourceImportSheet(
        existingProjects: existingProjects,
        onImported: onImported,
      ),
    );
  }

  @override
  State<OpenSourceImportSheet> createState() => _OpenSourceImportSheetState();
}

class _OpenSourceImportSheetState extends State<OpenSourceImportSheet> {
  final _githubApi = GithubApi();
  final _search = TextEditingController();
  List<GithubRepo> _repos = [];
  bool _loading = false;
  bool _saving = false;
  String? _error;
  String? _addingFullName;

  @override
  void initState() {
    super.initState();
    _loadRepos();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  int get _linkedCount => ProjectItem.githubOnly(widget.existingProjects).length;

  List<GithubRepo> get _filtered {
    final q = _search.text.trim().toLowerCase();
    if (q.isEmpty) return _repos;
    return _repos
        .where(
          (r) =>
              r.fullName.toLowerCase().contains(q) || r.name.toLowerCase().contains(q),
        )
        .toList();
  }

  Future<void> _loadRepos() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      setState(() => _error = 'Not signed in.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final repos = await _githubApi.fetchMyRepos(accessToken: token);
      if (!mounted) return;
      setState(() {
        _repos = repos;
        _loading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to fetch repositories.';
      });
    }
  }

  Future<void> _addRepo(GithubRepo repo) async {
    if (_saving) return;
    if (_linkedCount >= openSourceMaxGithubRepos) {
      setState(
        () => _error = 'You can link up to $openSourceMaxGithubRepos repositories.',
      );
      return;
    }
    if (projectListContainsGithubRepo(widget.existingProjects, repo.fullName)) {
      setState(() => _error = 'Already linked.');
      return;
    }

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) return;

    setState(() {
      _saving = true;
      _addingFullName = repo.fullName;
      _error = null;
    });

    try {
      final batch = await _githubApi.importReposBatch(
        accessToken: token,
        fullNames: [repo.fullName],
      );
      final importedJson = batch.projects.isNotEmpty ? batch.projects.first : null;
      if (importedJson == null) {
        final fail = batch.failed.isNotEmpty ? batch.failed.first.message : 'Failed to import repo.';
        throw AuthApiException(fail);
      }

      final imported = ProjectItem.fromJson(importedJson);
      final next = [...widget.existingProjects, imported];

      if (!mounted) return;
      final err = await context.read<AuthState>().updateProfileSection('projects', {
        'projects': next.map((e) => e.toJson()).toList(),
        'isGitAccount': true,
      });

      if (!mounted) return;
      setState(() {
        _saving = false;
        _addingFullName = null;
      });

      if (err != null) {
        setState(() => _error = formatUserMessage(err));
        return;
      }

      widget.onImported();
      if (mounted) Navigator.of(context).pop();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _addingFullName = null;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _addingFullName = null;
        _error = 'Failed to import repository.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final filtered = _filtered;
    final busy = _loading || _saving;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.88,
        ),
        decoration: BoxDecoration(
          color: colors.background,
          border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'ADD OPEN SOURCE',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: busy ? null : () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Uses your linked GitHub token · $_linkedCount/$openSourceMaxGithubRepos linked',
                style: GoogleFonts.inter(fontSize: 10, color: colors.mutedForeground),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: AuthTextField(
                controller: _search,
                label: 'SEARCH REPOS',
                hintText: 'owner/repo',
                maxLength: 80,
                onChanged: (_) => setState(() {}),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _error!,
                  style: GoogleFonts.inter(fontSize: 12, color: colors.destructive),
                ),
              ),
            ],
            const SizedBox(height: 10),
            Expanded(
              child: _loading
                  ? Center(child: CircularProgressIndicator(color: colors.primary))
                  : filtered.isEmpty
                  ? Center(
                      child: Text(
                        'NO REPOS FOUND.',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: colors.mutedForeground,
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final repo = filtered[index];
                        final already = projectListContainsGithubRepo(
                          widget.existingProjects,
                          repo.fullName,
                        );
                        final addingThis = _addingFullName == repo.fullName;
                        return _RepoPickRow(
                          repo: repo,
                          alreadyLinked: already,
                          busy: busy,
                          adding: addingThis,
                          onAdd: already || busy ? null : () => _addRepo(repo),
                        );
                      },
                    ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: busy ? null : _loadRepos,
                    child: Text(
                      'REFRESH REPOS',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RepoPickRow extends StatelessWidget {
  const _RepoPickRow({
    required this.repo,
    required this.alreadyLinked,
    required this.busy,
    required this.adding,
    this.onAdd,
  });

  final GithubRepo repo;
  final bool alreadyLinked;
  final bool busy;
  final bool adding;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  repo.name.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  repo.fullName.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 9, color: colors.mutedForeground),
                ),
                if (repo.description?.isNotEmpty == true) ...[
                  const SizedBox(height: 6),
                  Text(
                    repo.description!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 10, color: colors.mutedForeground),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: onAdd,
            style: ElevatedButton.styleFrom(
              backgroundColor: alreadyLinked ? colors.muted : colors.primary,
              foregroundColor: alreadyLinked ? colors.mutedForeground : colors.primaryForeground,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            child: adding
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: colors.primaryForeground,
                    ),
                  )
                : Text(
                    alreadyLinked ? 'LINKED' : 'ADD',
                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900),
                  ),
          ),
        ],
      ),
    );
  }
}
