class GithubRepoParseResult {
  const GithubRepoParseResult({
    this.owner,
    this.repo,
    this.url,
  });

  final String? owner;
  final String? repo;
  final String? url;

  bool get isValid => owner != null && repo != null;
}

GithubRepoParseResult parseGithubRepoUrl(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return const GithubRepoParseResult();

  var href = trimmed;
  if (!href.contains('://')) href = 'https://$href';

  final uri = Uri.tryParse(href);
  if (uri == null) return const GithubRepoParseResult();

  final host = uri.host.toLowerCase();
  if (!RegExp(r'^(www\.)?github\.com$').hasMatch(host)) {
    return const GithubRepoParseResult();
  }

  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.length < 2) return const GithubRepoParseResult();

  final owner = segments[0];
  final repo = segments[1].replaceAll(RegExp(r'\.git$'), '');
  return GithubRepoParseResult(
    owner: owner,
    repo: repo,
    url: 'https://github.com/$owner/$repo',
  );
}
