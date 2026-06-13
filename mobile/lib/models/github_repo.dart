class GithubRepo {
  const GithubRepo({
    required this.id,
    required this.name,
    required this.fullName,
    required this.htmlUrl,
    this.description,
    this.language,
    this.stargazersCount = 0,
    this.forksCount = 0,
    this.ownerLogin = '',
  });

  factory GithubRepo.fromJson(Map<String, dynamic> json) {
    final owner = json['owner'];
    return GithubRepo(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      name: json['name']?.toString().trim() ?? '',
      fullName: json['full_name']?.toString().trim() ?? '',
      htmlUrl: json['html_url']?.toString().trim() ?? '',
      description: json['description']?.toString().trim(),
      language: json['language']?.toString().trim(),
      stargazersCount: json['stargazers_count'] is int
          ? json['stargazers_count'] as int
          : int.tryParse('${json['stargazers_count']}') ?? 0,
      forksCount: json['forks_count'] is int
          ? json['forks_count'] as int
          : int.tryParse('${json['forks_count']}') ?? 0,
      ownerLogin: owner is Map ? owner['login']?.toString().trim() ?? '' : '',
    );
  }

  final int id;
  final String name;
  final String fullName;
  final String htmlUrl;
  final String? description;
  final String? language;
  final int stargazersCount;
  final int forksCount;
  final String ownerLogin;
}

class GithubImportBatchResult {
  const GithubImportBatchResult({
    required this.projects,
    this.failed = const [],
  });

  final List<Map<String, dynamic>> projects;
  final List<GithubImportFailure> failed;
}

class GithubImportFailure {
  const GithubImportFailure({required this.fullName, required this.message});

  factory GithubImportFailure.fromJson(Map<String, dynamic> json) {
    return GithubImportFailure(
      fullName: json['fullName']?.toString().trim() ?? '',
      message: json['message']?.toString().trim() ?? 'Import failed.',
    );
  }

  final String fullName;
  final String message;
}
