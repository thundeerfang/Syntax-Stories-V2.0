import '../models/project_item.dart';

String normalizeGithubRepoFullName(String fullName) {
  return fullName
      .trim()
      .split('/')
      .map((s) => s.trim())
      .where((s) => s.isNotEmpty)
      .join('/');
}

String githubRepoPublicationUrl(String fullName) {
  final normalized = normalizeGithubRepoFullName(fullName);
  final parts = normalized.split('/');
  final path = parts.map((p) => p.toLowerCase()).join('/');
  return 'https://github.com/$path';
}

bool projectMatchesGithubRepo(ProjectItem project, String fullName) {
  if (!project.isGithub) return false;
  final want = normalizeGithubRepoFullName(fullName).toLowerCase();
  if (!want.contains('/')) return false;

  final repoFullName = project.repoFullName?.trim();
  if (repoFullName != null && repoFullName.isNotEmpty) {
    if (normalizeGithubRepoFullName(repoFullName).toLowerCase() == want) {
      return true;
    }
  }

  final url = project.publicationUrl?.trim().toLowerCase().replaceAll(RegExp(r'/+$'), '');
  if (url != null && url.isNotEmpty) {
    return url == githubRepoPublicationUrl(fullName).toLowerCase();
  }
  return false;
}

bool projectListContainsGithubRepo(List<ProjectItem> projects, String fullName) {
  for (final p in projects) {
    if (projectMatchesGithubRepo(p, fullName)) return true;
  }
  return false;
}

List<ProjectItem> removeGithubRepoFromProjects(
  List<ProjectItem> projects,
  String repoFullName,
) {
  return projects.where((p) => !projectMatchesGithubRepo(p, repoFullName)).toList();
}
